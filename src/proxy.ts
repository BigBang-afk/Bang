import { NextResponse, type NextRequest } from "next/server";
import { decryptSession } from "@/lib/auth/session";

/**
 * Optimistic route protection only — reads the session cookie without a
 * database round trip. The real authorization source of truth lives in the
 * Data Access Layer (src/lib/auth/dal.ts), which every page/action calls.
 */
const PUBLIC_ROUTES = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("zj_session")?.value;
  const session = await decryptSession(token);
  const isAuthenticated = !!session && new Date(session.expiresAt).getTime() > Date.now();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
