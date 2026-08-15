import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma/bcrypt) used by middleware.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
        token.avatarColor = (user as { avatarColor: string }).avatarColor;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatarColor = token.avatarColor as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname, origin } = request.nextUrl;

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        if (auth.user.role !== "ADMIN") {
          return Response.redirect(new URL("/dashboard", origin));
        }
        return true;
      }

      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }

      if ((pathname === "/login" || pathname === "/register") && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", origin));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
