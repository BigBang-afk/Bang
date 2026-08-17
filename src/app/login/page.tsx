import { Gem } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in | Zarghoon Jewellers",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(201,162,77,0.10) 0%, rgba(201,162,77,0) 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-gold-muted/40 bg-gold-soft">
            <Gem className="size-6 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-wide text-foreground">
            ZARGHOON JEWELLERS
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-gold">
            AI Business OS
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-xl sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Sign in</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your credentials to access the business dashboard.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is restricted to authorized Zarghoon Jewellers staff.
        </p>
      </div>
    </div>
  );
}
