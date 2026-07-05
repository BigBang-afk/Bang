import { feedManager } from "../priceFeed/feedManager";
import { HttpError } from "../util/httpError";

/** USD value of one unit of `asset`. Throws rather than guessing if the feed is down. */
export function usdPriceFor(asset: "ETH" | "USDT"): number {
  if (asset === "USDT") return 1; // stablecoin, pegged 1:1 to USD
  if (asset === "ETH") return feedManager.getLivePrice("ETH/USDT").price;
  throw new HttpError(400, `Unsupported asset: ${asset}`);
}

export function weiToDecimal(amountWei: string, decimals: number): number {
  return Number(amountWei) / 10 ** decimals;
}

export function decimalToUsdCents(amount: number, asset: "ETH" | "USDT"): bigint {
  return BigInt(Math.round(amount * usdPriceFor(asset) * 100));
}
