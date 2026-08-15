import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { MiniSymbolOverview } from "@/components/tradingview/symbol-overview";
import { ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16">
        <Link href="/">
          <Logo />
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-foreground-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>

        <p className="text-center text-xs text-foreground-muted lg:text-left">
          © {new Date().getFullYear()} Nexara Markets, Inc.
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-border-subtle bg-background-elevated lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="grid-fade absolute inset-0 -z-10" />
        <div className="absolute -inset-20 -z-10 bg-gradient-to-br from-brand-green/10 via-brand-cyan/5 to-brand-violet/10 blur-3xl" />

        <h2 className="font-display text-3xl font-bold leading-tight">
          Trade with clarity.
          <br />
          <span className="gradient-text">Powered by AI.</span>
        </h2>

        <div className="glass-card mt-8 rounded-2xl p-4">
          <MiniSymbolOverview symbol="NASDAQ:NVDA" className="h-[220px] w-full" />
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {[
            { icon: TrendingUp, text: "Real-time TradingView charts across every asset class" },
            { icon: Sparkles, text: "AI confidence scoring on every symbol you follow" },
            { icon: ShieldCheck, text: "Bank-grade security for your account and data" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-sm text-foreground-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface">
                <item.icon className="h-4 w-4 text-brand-green" />
              </span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
