import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export interface Instrument {
  symbol: string;
  assetClass: "CRYPTO" | "FOREX" | "STOCK";
  payoutRatio: number;
  live: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Trade {
  id: number;
  symbol: string;
  assetClass: string;
  direction: "UP" | "DOWN";
  stakeCents: string;
  payoutRatio: number;
  entryPrice: number;
  entryAt: string;
  expiryAt: string;
  exitPrice: number | null;
  status: "OPEN" | "WON" | "LOST" | "PUSH";
  payoutCents: string | null;
  settledAt: string | null;
}

export interface Deposit {
  id: number;
  txHash: string;
  asset: string;
  amountUsdCents: string;
  confirmations: number;
  status: "PENDING" | "CONFIRMED";
  createdAt: string;
}

export interface Withdrawal {
  id: number;
  toAddress: string;
  asset: string;
  amountUsdCents: string;
  status: string;
  txHash: string | null;
  createdAt: string;
}

export interface Me {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
  balanceCents: string;
}
