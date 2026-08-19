import { jsonOk } from "@/lib/api-helpers";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/auth-admin";
import { logAdminActivity } from "@/lib/activity-log";

export async function POST() {
  const session = await getAdminSession();
  if (session) {
    await logAdminActivity({ adminId: session.adminId, action: "LOGOUT", description: `${session.name} logged out` });
  }
  const res = jsonOk({ success: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
