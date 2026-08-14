import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent)",
        }}
        aria-hidden="true"
      />

      <Link href="/" className="mb-8">
        <Logo />
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
