import { Calculator, LineChart, ScanSearch, Sparkles } from "lucide-react";

const steps = [
  {
    icon: ScanSearch,
    title: "Scan the market",
    description:
      "Screen crypto, forex, gold and index assets against technical conditions you care about.",
  },
  {
    icon: Sparkles,
    title: "Get AI analysis",
    description:
      "Every asset comes with structured, AI-generated market analysis — context, not just numbers.",
  },
  {
    icon: LineChart,
    title: "Review a setup",
    description:
      "See a clear entry, stop-loss and take-profit structure with a stated risk/reward ratio.",
  },
  {
    icon: Calculator,
    title: "Size the position",
    description:
      "Run it through the risk calculator before you ever place a trade.",
  },
];

export function ProductExplanation() {
  return (
    <section id="product" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          One workflow, from idea to journal entry
        </h2>
        <p className="mt-4 text-muted-foreground">
          Lumenex connects the steps traders usually juggle across five different tabs
          into a single, structured workflow.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="relative rounded-xl border border-border bg-card p-6">
            <span className="text-xs font-medium text-muted-foreground">
              Step {index + 1}
            </span>
            <div className="mt-4 flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <step.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-medium">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
