import { prisma } from "../db/client";
import { config } from "../config";
import { fetchIncomingEthTxs, fetchIncomingTokenTxs } from "./etherscan";
import { decimalToUsdCents, weiToDecimal } from "./pricing";

const POLL_INTERVAL_MS = 30_000;

export function startDepositMonitor() {
  if (!config.etherscanApiKey) {
    console.warn("[depositMonitor] ETHERSCAN_API_KEY not set — crypto deposits will not be detected.");
    return;
  }
  poll().catch((err) => console.error("[depositMonitor] poll error", err));
  setInterval(() => {
    poll().catch((err) => console.error("[depositMonitor] poll error", err));
  }, POLL_INTERVAL_MS);
}

async function poll() {
  const addresses = await prisma.depositAddress.findMany();
  for (const { userId, address } of addresses) {
    await checkEth(userId, address);
    await checkUsdt(userId, address);
  }
}

async function checkEth(userId: number, address: string) {
  const txs = await fetchIncomingEthTxs(address);
  for (const tx of txs) {
    const confirmations = Number(tx.confirmations);
    const existing = await prisma.deposit.findUnique({
      where: { txHash_logIndex_asset: { txHash: tx.hash, logIndex: 0, asset: "ETH" } },
    });

    if (existing?.status === "CONFIRMED") continue;

    const amountEth = weiToDecimal(tx.value, 18);
    const isConfirmed = confirmations >= config.depositMinConfirmations;
    const amountUsdCents = isConfirmed ? safeUsdCents(amountEth, "ETH") : 0n;

    await upsertDeposit({
      userId,
      txHash: tx.hash,
      logIndex: 0,
      asset: "ETH",
      amountWei: tx.value,
      confirmations,
      amountUsdCents,
      isConfirmed,
      existingId: existing?.id,
    });
  }
}

async function checkUsdt(userId: number, address: string) {
  const txs = await fetchIncomingTokenTxs(address, config.usdtContractAddress);
  for (const [idx, tx] of txs.entries()) {
    const confirmations = Number(tx.confirmations);
    const existing = await prisma.deposit.findUnique({
      where: { txHash_logIndex_asset: { txHash: tx.hash, logIndex: idx, asset: "USDT" } },
    });

    if (existing?.status === "CONFIRMED") continue;

    const decimals = Number(tx.tokenDecimal ?? 6);
    const amountUsdt = weiToDecimal(tx.value, decimals);
    const isConfirmed = confirmations >= config.depositMinConfirmations;
    const amountUsdCents = isConfirmed ? safeUsdCents(amountUsdt, "USDT") : 0n;

    await upsertDeposit({
      userId,
      txHash: tx.hash,
      logIndex: idx,
      asset: "USDT",
      amountWei: tx.value,
      confirmations,
      amountUsdCents,
      isConfirmed,
      existingId: existing?.id,
    });
  }
}

function safeUsdCents(amount: number, asset: "ETH" | "USDT"): bigint {
  try {
    return decimalToUsdCents(amount, asset);
  } catch {
    // Live price unavailable right now; leave at 0 and it will be recomputed
    // (and credited) on a later poll once the feed is back and confirmations hold.
    return 0n;
  }
}

async function upsertDeposit(params: {
  userId: number;
  txHash: string;
  logIndex: number;
  asset: "ETH" | "USDT";
  amountWei: string;
  confirmations: number;
  amountUsdCents: bigint;
  isConfirmed: boolean;
  existingId?: number;
}) {
  const { userId, txHash, logIndex, asset, amountWei, confirmations, amountUsdCents, isConfirmed, existingId } =
    params;

  if (existingId) {
    await prisma.deposit.update({
      where: { id: existingId },
      data: { confirmations },
    });
  }

  // Credit exactly once: only cross PENDING -> CONFIRMED when we have both
  // enough confirmations and a real USD value for the credited amount.
  if (isConfirmed && amountUsdCents > 0n) {
    await prisma.$transaction(async (tx) => {
      const deposit = existingId
        ? await tx.deposit.findUnique({ where: { id: existingId } })
        : await tx.deposit.create({
            data: { userId, txHash, logIndex, asset, amountWei, confirmations, amountUsdCents, status: "PENDING" },
          });

      if (!deposit || deposit.status === "CONFIRMED") return;

      await tx.deposit.update({
        where: { id: deposit.id },
        data: { status: "CONFIRMED", amountUsdCents, confirmedAt: new Date() },
      });
      await tx.user.update({ where: { id: userId }, data: { balanceCents: { increment: amountUsdCents } } });
    });
  } else if (!existingId) {
    await prisma.deposit.create({
      data: { userId, txHash, logIndex, asset, amountWei, confirmations, amountUsdCents: 0n, status: "PENDING" },
    });
  }
}
