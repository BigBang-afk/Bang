import { HDNodeWallet } from "ethers";
import { prisma } from "../db/client";
import { config } from "../config";
import { HttpError } from "../util/httpError";

const DERIVATION_BASE_PATH = "m/44'/60'/0'/0";

function requireMnemonic(): string {
  if (!config.hdWalletMnemonic) {
    throw new HttpError(503, "Wallet is not configured (HD_WALLET_MNEMONIC missing)");
  }
  return config.hdWalletMnemonic;
}

function deriveNode(index: number): HDNodeWallet {
  const root = HDNodeWallet.fromPhrase(requireMnemonic());
  return root.derivePath(`${DERIVATION_BASE_PATH}/${index}`);
}

/** Deterministically derives (and persists) a deposit address for a user. Idempotent. */
export async function createDepositAddressForUser(userId: number) {
  const existing = await prisma.depositAddress.findUnique({ where: { userId } });
  if (existing) return existing;

  // userId is already unique and stable, so it doubles as the derivation index.
  const node = deriveNode(userId);
  return prisma.depositAddress.create({
    data: { userId, address: node.address, derivationIndex: userId },
  });
}

/** Only ever called server-side to sign an approved withdrawal. Never expose this over the API. */
export async function getSigningKeyForUser(userId: number): Promise<string> {
  const record = await prisma.depositAddress.findUnique({ where: { userId } });
  if (!record) throw new HttpError(404, "User has no deposit address yet");
  return deriveNode(record.derivationIndex).privateKey;
}
