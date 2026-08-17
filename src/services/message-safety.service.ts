/**
 * Message safety rules — see AI-MARKETING.md "Message safety". Every
 * AI-generated (or human-edited) marketing message is checked against
 * this list before it can leave DRAFT/PENDING_APPROVAL. Pure and
 * synchronous so it can run both server-side (before saving a campaign)
 * and be unit-tested directly with no database.
 */

export type SafetyViolation = { rule: string; message: string };

const BANNED_PATTERN_RULES: { rule: string; pattern: RegExp; message: string }[] = [
  {
    rule: "fake_scarcity",
    pattern: /\bonly\s+\d+\s+(left|remaining|pieces?|items?)\b/i,
    message: "Avoid fake scarcity claims (e.g. \"only N left\").",
  },
  {
    rule: "guaranteed_returns",
    pattern: /\bguarante(e|ed)\b[^.]{0,40}\b(return|profit|price|investment|value)\b/i,
    message: "Avoid guaranteed investment/return claims.",
  },
  {
    rule: "risk_free_investment",
    pattern: /\b(risk[-\s]?free|100%\s+guaranteed|double\s+your\s+money)\b/i,
    message: "Avoid risk-free/guaranteed-money claims.",
  },
  {
    rule: "investment_advice",
    pattern: /\b(best\s+investment|invest\s+now|gold\s+(price\s+)?will\s+(rise|go\s+up|increase))\b/i,
    message: "Avoid investment or trading advice — gold rate messages must stay informational.",
  },
  {
    rule: "pressure_tactics",
    pattern: /\b(hurry|act\s+now|don'?t\s+miss\s+out|last\s+chance|urgent(ly)?|offer\s+ends\s+today)\b/i,
    message: "Avoid pressure tactics.",
  },
  {
    rule: "misleading_certainty",
    pattern: /\b(guaranteed\s+lowest\s+price|cheapest\s+in\s+(town|pakistan|the\s+country))\b/i,
    message: "Avoid unverifiable/misleading price claims.",
  },
];

/** A discount/percentage mentioned in the message must also appear, verbatim, in the campaign's own authorized `offer` text — never a number the message invents on its own. */
function findUnauthorizedDiscountMentions(text: string, authorizedOffer?: string): SafetyViolation[] {
  const discountMentions = text.match(/\b\d{1,3}\s?%\s*(off|discount)?\b/gi) ?? [];
  if (discountMentions.length === 0) return [];
  const offer = authorizedOffer ?? "";
  const unauthorized = discountMentions.filter((mention) => !offer.toLowerCase().includes(mention.toLowerCase().replace(/\s+/g, " ").trim()));
  if (unauthorized.length === 0) return [];
  return [
    {
      rule: "unauthorized_discount",
      message: `Message mentions a discount (${unauthorized.join(", ")}) not present in the campaign's authorized Offer field.`,
    },
  ];
}

export function validateMessageSafety(text: string, options?: { authorizedOffer?: string }): { safe: boolean; violations: SafetyViolation[] } {
  const violations: SafetyViolation[] = [];
  for (const rule of BANNED_PATTERN_RULES) {
    if (rule.pattern.test(text)) violations.push({ rule: rule.rule, message: rule.message });
  }
  violations.push(...findUnauthorizedDiscountMentions(text, options?.authorizedOffer));
  return { safe: violations.length === 0, violations };
}

export class MessageSafetyViolationError extends Error {
  violations: SafetyViolation[];
  constructor(violations: SafetyViolation[]) {
    super(`Message failed safety validation: ${violations.map((v) => v.message).join(" ")}`);
    this.name = "MessageSafetyViolationError";
    this.violations = violations;
  }
}
