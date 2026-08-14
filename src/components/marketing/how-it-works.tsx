const items = [
  {
    step: "01",
    title: "Connect your workflow",
    description: "Create an account and pick the markets you actually trade.",
  },
  {
    step: "02",
    title: "Let the scanner and AI do the first pass",
    description: "Surface setups worth your attention instead of scrolling charts all day.",
  },
  {
    step: "03",
    title: "Decide, size, and log the trade",
    description: "Use the risk calculator, then track the outcome in your journal automatically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
        <p className="mt-4 text-muted-foreground">
          Three steps from sign-up to a logged, risk-managed trade.
        </p>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.step} className="relative">
            <span className="text-5xl font-semibold text-primary/25">{item.step}</span>
            <h3 className="mt-2 text-lg font-medium">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
