import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Optional password protection for the whole app (HTTP Basic Auth).
// Enabled only when BASIC_AUTH_PASSWORD is set. Use this if the app is on the internet.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function proxy(request: NextRequest) {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) return NextResponse.next();
  const user = process.env.BASIC_AUTH_USER || "agent";

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx !== -1 && safeEqual(decoded.slice(0, idx), user) && safeEqual(decoded.slice(idx + 1), password)) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AI Lead Assistant"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
