import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Bring structure to your next trade
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Create a free account and see your first AI-generated market analysis
          in minutes.
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/register">
                Start free
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
