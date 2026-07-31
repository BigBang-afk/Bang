export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "ws://localhost:8000";

export const EXPIRY_OPTIONS_SECONDS = [15, 30, 60, 120, 180, 300] as const;

export function formatExpiryLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${seconds / 60}m`;
}
