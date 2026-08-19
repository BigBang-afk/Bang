import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { ADMIN_COOKIE_NAME, getAdminSecret } from "@/lib/auth-constants";

// Optimistic edge check only — protects rendering of the admin UI and
// gates API routes at the door. Every admin API route also re-verifies the
// session itself (see requireAdmin() in src/lib/api-helpers.ts), so this is
// defense in depth, not the sole guard.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminAuthRoute =
    pathname === "/admin/login" || pathname === "/api/admin/auth/login";
  const isProtectedAdminPage = pathname.startsWith("/admin") && !isAdminAuthRoute;
  const isProtectedAdminApi =
    pathname.startsWith("/api/admin") && !isAdminAuthRoute;

  if (!isProtectedAdminPage && !isProtectedAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const valid = token ? await verify(token) : false;

  if (valid) return NextResponse.next();

  if (isProtectedAdminApi) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

async function verify(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, new TextEncoder().encode(getAdminSecret()));
    return true;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
