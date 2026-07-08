"use client";

const QUOTEX_URL = "https://market-qx.trade/en/";

export function QuotexButton() {
  return (
    <a
      href={QUOTEX_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent/60 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/20"
    >
      Open Quotex Chart
      <span aria-hidden>↗</span>
    </a>
  );
}
