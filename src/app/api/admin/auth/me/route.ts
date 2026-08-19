import { getAdminSession } from "@/lib/auth-admin";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const session = await getAdminSession();
  return jsonOk({ admin: session });
}
