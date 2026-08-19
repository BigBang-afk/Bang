import { jsonOk } from "@/lib/api-helpers";
import { CUSTOMER_COOKIE_NAME } from "@/lib/auth-customer";

export async function POST() {
  const res = jsonOk({ success: true });
  res.cookies.set(CUSTOMER_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
