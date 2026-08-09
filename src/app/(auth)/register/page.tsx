import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const hasAnyUser = (await prisma.user.count()) > 0;
  if (hasAnyUser) redirect("/login");

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">Create your account</h2>
      <p className="mb-6 text-sm text-muted">
        This is a personal, single-user application. You&apos;ll set up your trading account next.
      </p>
      <RegisterForm />
    </div>
  );
}
