import { Contract, JsonRpcProvider, Wallet, parseEther, parseUnits } from "ethers";
import { prisma } from "../db/client";
import { config } from "../config";
import { HttpError } from "../util/httpError";
import { getSigningKeyForUser } from "./hdWallet";
import { usdPriceFor } from "./pricing";

const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
const USDT_DECIMALS = 6;

export async function requestWithdrawal(params: {
  userId: number;
  toAddress: string;
  asset: "ETH" | "USDT";
  amountUsdCents: bigint;
}) {
  const { userId, toAddress, asset, amountUsdCents } = params;
  if (amountUsdCents <= 0n) throw new HttpError(400, "Amount must be positive");
  if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) throw new HttpError(400, "Invalid Ethereum address");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.balanceCents < amountUsdCents) throw new HttpError(400, "Insufficient balance");

    await tx.user.update({ where: { id: userId }, data: { balanceCents: { decrement: amountUsdCents } } });

    return tx.withdrawal.create({
      data: { userId, toAddress, asset, amountUsdCents, status: "PENDING_REVIEW" },
    });
  });
}

/** Admin-only. Approves a pending withdrawal and broadcasts it on-chain. */
export async function approveAndBroadcastWithdrawal(withdrawalId: number, adminId: number) {
  const withdrawal = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
  if (withdrawal.status !== "PENDING_REVIEW") {
    throw new HttpError(409, `Withdrawal is not pending review (status: ${withdrawal.status})`);
  }

  await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: { status: "APPROVED", reviewedBy: adminId },
  });

  try {
    const privateKey = await getSigningKeyForUser(withdrawal.userId);
    const provider = new JsonRpcProvider(config.ethRpcUrl);
    const signer = new Wallet(privateKey, provider);

    const usdCents = Number(withdrawal.amountUsdCents) / 100;
    let txHash: string;

    if (withdrawal.asset === "ETH") {
      const ethAmount = usdCents / usdPriceFor("ETH");
      const tx = await signer.sendTransaction({ to: withdrawal.toAddress, value: parseEther(ethAmount.toFixed(18)) });
      txHash = tx.hash;
    } else if (withdrawal.asset === "USDT") {
      // Native ETH must already be present at this address (from the user's
      // own deposits) to pay gas — see README for the operational caveat.
      const usdtAmount = usdCents / usdPriceFor("USDT");
      const contract = new Contract(config.usdtContractAddress, ERC20_ABI, signer);
      const tx = await contract.transfer(withdrawal.toAddress, parseUnits(usdtAmount.toFixed(USDT_DECIMALS), USDT_DECIMALS));
      txHash = tx.hash;
    } else {
      throw new Error(`Unsupported asset ${withdrawal.asset}`);
    }

    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "BROADCAST", txHash },
    });
  } catch (err) {
    // Broadcasting failed (e.g. insufficient gas at the user's address) —
    // refund the escrowed balance rather than silently losing funds.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: { balanceCents: { increment: withdrawal.amountUsdCents } },
      });
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: "FAILED", reviewNote: (err as Error).message },
      });
    });
    throw err;
  }
}

export async function rejectWithdrawal(withdrawalId: number, adminId: number, note: string) {
  const withdrawal = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
  if (withdrawal.status !== "PENDING_REVIEW") {
    throw new HttpError(409, `Withdrawal is not pending review (status: ${withdrawal.status})`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: withdrawal.userId },
      data: { balanceCents: { increment: withdrawal.amountUsdCents } },
    });
    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "REJECTED", reviewedBy: adminId, reviewNote: note },
    });
  });
}
