/**
 * The closed, allowed set of message placeholders — see AI-MARKETING.md
 * "Message personalization". A message template may only ever contain
 * these tokens; `substitutePlaceholders` never inserts anything the
 * caller didn't explicitly supply, and never invents a value for a
 * missing one (it's left as literal, visible text so a reviewer notices
 * a template/context mismatch before a campaign launches, rather than
 * silently sending a blank).
 */
export const MESSAGE_PLACEHOLDERS = [
  "customer_name",
  "product_name",
  "shop_name",
  "gold_rate",
  "offer",
  "expiry_date",
] as const;
export type MessagePlaceholder = (typeof MESSAGE_PLACEHOLDERS)[number];

export type PlaceholderValues = Partial<Record<MessagePlaceholder, string>>;

const PLACEHOLDER_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

/** Pure and testable — replaces every {{known_key}} with its supplied value; leaves an unrecognized or unsupplied placeholder untouched. */
export function substitutePlaceholders(template: string, values: PlaceholderValues): string {
  return template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    if ((MESSAGE_PLACEHOLDERS as readonly string[]).includes(key) && values[key as MessagePlaceholder] !== undefined) {
      return values[key as MessagePlaceholder] as string;
    }
    return match;
  });
}

/** Returns every placeholder token present in a template, for validation/preview UI. */
export function extractPlaceholders(template: string): MessagePlaceholder[] {
  const found = new Set<MessagePlaceholder>();
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const key = match[1];
    if ((MESSAGE_PLACEHOLDERS as readonly string[]).includes(key)) found.add(key as MessagePlaceholder);
  }
  return [...found];
}
