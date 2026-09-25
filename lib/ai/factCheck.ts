// A light safety net on top of the prompt: flags numbers, prices and clock
// times in AI output that do not appear anywhere in the lead information.
// It cannot catch everything, so the UI always asks the agent to review drafts.

const NUMBER_RE = /\d[\d,.]*/g;
const TIME_RE = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi;
const MONEY_RE = /(?:[$€£¥₹]|\b(?:usd|eur|gbp|aed|inr|sar)\s?)\s?\d[\d,.]*\s?(?:k|m|million|thousand)?/gi;

function digits(s: string): string {
  return s.replace(/[^\d]/g, "");
}

export function findUnsupportedClaims(message: string, sourceText: string): string[] {
  const sourceNumbers = (sourceText.match(NUMBER_RE) ?? []).map(digits).filter(Boolean);
  const supported = (value: string) => {
    const d = digits(value);
    if (d === "" || sourceNumbers.includes(d)) return true;
    // Allow abbreviations of a supplied number, e.g. "$350k" for "$350,000".
    return d.length >= 3 && sourceNumbers.some((n) => n.startsWith(d));
  };

  const warnings = new Set<string>();
  for (const m of message.match(MONEY_RE) ?? []) {
    if (!supported(m)) warnings.add(`Mentions a price "${m.trim()}" that isn't in the lead info`);
  }
  for (const m of message.match(TIME_RE) ?? []) {
    if (!supported(m)) warnings.add(`Mentions a time "${m.trim()}" that isn't in the lead info`);
  }
  for (const m of message.match(NUMBER_RE) ?? []) {
    const d = digits(m);
    if (d.length === 0 || /^[1-9]$/.test(d)) continue; // single digits ("2 bedrooms", "1 day") are fine
    if (!supported(m) && ![...warnings].some((w) => w.includes(m.replace(/[.,]$/, "")))) {
      warnings.add(`Mentions the number "${m.replace(/[.,]$/, "")}" that isn't in the lead info`);
    }
  }
  return [...warnings];
}
