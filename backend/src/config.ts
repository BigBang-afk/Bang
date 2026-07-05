import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  // data-stream.binance.vision is Binance's public market-data-only endpoint:
  // no API key, and (unlike stream.binance.com / the trading API) not subject
  // to the same country-eligibility blocking.
  binanceWsUrl: process.env.BINANCE_WS_URL ?? "wss://data-stream.binance.vision/stream",

  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY ?? "",
  twelveDataWsUrl: process.env.TWELVE_DATA_WS_URL ?? "wss://ws.twelvedata.com/v1/quotes/price",

  ethRpcUrl: process.env.ETH_RPC_URL ?? "",
  etherscanApiKey: process.env.ETHERSCAN_API_KEY ?? "",
  etherscanApiUrl: process.env.ETHERSCAN_API_URL ?? "https://api.etherscan.io/api",
  usdtContractAddress: (process.env.USDT_CONTRACT_ADDRESS ?? "0xdAC17F958D2ee523a2206206994597C13D831ec").toLowerCase(),
  hdWalletMnemonic: process.env.HD_WALLET_MNEMONIC ?? "",
  depositMinConfirmations: Number(process.env.DEPOSIT_MIN_CONFIRMATIONS ?? 12),
};

export function requireWalletConfig() {
  required("ETH_RPC_URL", config.ethRpcUrl);
  required("ETHERSCAN_API_KEY", config.etherscanApiKey);
  required("HD_WALLET_MNEMONIC", config.hdWalletMnemonic);
}
