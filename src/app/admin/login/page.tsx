import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirectTo && params.redirectTo.startsWith("/admin") ? params.redirectTo : "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl tracking-wide text-ivory">Zarghoon Jewellers</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">Admin Panel</p>
        </div>
        <div className="rounded-sm border border-white/10 bg-white p-8 shadow-2xl">
          <h1 className="mb-6 font-serif text-xl text-charcoal">Sign in to continue</h1>
          {params.error === "account_inactive" && (
            <p className="mb-4 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Your account has been deactivated. Contact the Super Admin.
            </p>
          )}
          <LoginForm redirectTo={redirectTo} />
        </div>
        <p className="mt-6 text-center text-xs text-ivory/50">
          Protected area. All access attempts are logged.
        </p>
      </div>
    </div>
  );
}
