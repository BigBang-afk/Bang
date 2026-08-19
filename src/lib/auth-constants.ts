export const ADMIN_COOKIE_NAME = "zj_admin_session";
export const CUSTOMER_COOKIE_NAME = "zj_customer_session";

export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
export const ADMIN_SESSION_REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export function getAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return secret;
}

export function getCustomerSecret(): string {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) throw new Error("CUSTOMER_SESSION_SECRET is not configured");
  return secret;
}
