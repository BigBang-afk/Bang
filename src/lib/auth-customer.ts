import "server-only";
import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/session";
import {
  CUSTOMER_COOKIE_NAME,
  CUSTOMER_SESSION_TTL_SECONDS,
  getCustomerSecret,
} from "@/lib/auth-constants";

export type CustomerSessionData = {
  customerId: string;
  fullName: string;
  mobile: string;
};

export async function createCustomerSessionCookie(
  data: CustomerSessionData,
): Promise<{ name: string; value: string; maxAge: number }> {
  const token = await signSession(
    { ...data },
    getCustomerSecret(),
    CUSTOMER_SESSION_TTL_SECONDS,
  );
  return { name: CUSTOMER_COOKIE_NAME, value: token, maxAge: CUSTOMER_SESSION_TTL_SECONDS };
}

export async function getCustomerSession(): Promise<CustomerSessionData | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySession<CustomerSessionData & { customerId: string }>(
    token,
    getCustomerSecret(),
  );
  if (!payload) return null;
  return {
    customerId: payload.customerId,
    fullName: payload.fullName,
    mobile: payload.mobile,
  };
}

export { CUSTOMER_COOKIE_NAME };
