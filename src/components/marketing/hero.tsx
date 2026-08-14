import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 16%, transparent), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          AI decision-support for serious traders
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          Trade with structure,
          <br />
          not gut feeling
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          {siteConfig.description}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            nativeButton={false}
            render={
              <Link href="/register">
                Start free — no card required
                <ArrowRight className="size-4" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            nativeButton={false}
            render={<Link href="/pricing">View pricing</Link>}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Decision-support, not financial advice. See our risk disclaimer below.
        </p>
      </div>
    </section>
  );
}
