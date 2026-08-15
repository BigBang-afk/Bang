import { ButtonLink } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="glass-card relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-green/10 via-transparent to-brand-violet/10" />
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Your next trade deserves <span className="gradient-text">better data.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-foreground-muted">
          Join thousands of traders using Nexara&apos;s AI-powered charts and signals.
          No credit card required to start.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/register" size="lg">
            Create your free account
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
