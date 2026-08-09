import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";
import Link from "next/link";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const hasAnyUser = (await prisma.user.count()) > 0;

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">Welcome back</h2>
      <p className="mb-6 text-sm text-muted">Log in to your trading command center.</p>
      <LoginForm />
      {!hasAnyUser && (
        <p className="mt-5 text-center text-xs text-muted">
          No account yet?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create your account
          </Link>
        </p>
      )}
    </div>
  );
}
