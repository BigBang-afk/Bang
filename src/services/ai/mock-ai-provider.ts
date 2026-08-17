import "server-only";
import type { z } from "zod";
import type {
  AiProvider,
  AiFacts,
  GenerateTextInput,
  GenerateTextResult,
  GenerateStructuredOutputInput,
  GenerateStructuredOutputResult,
  ClassifyInput,
  ClassifyResult,
  SummarizeInput,
} from "@/services/ai/ai-provider";

/**
 * The development/default AI provider — a deterministic, template-based
 * generator. It is not a hosted LLM: every output is assembled purely from
 * the `facts` the caller supplies, so it is structurally incapable of
 * inventing a preference, purchase, price, purity, or gold rate that
 * wasn't already true. See AI-ARCHITECTURE.md "Provider abstraction" for
 * why this is the shipped provider for Phase 7, with the seam left open
 * for a real hosted provider later.
 */

function estimateTokens(text: string): number {
  // A conservative, provider-agnostic heuristic (~4 chars/token) — good
  // enough for cost-tracking architecture without depending on any one
  // vendor's real tokenizer. A real provider implementation would report
  // its own exact token counts instead of estimating.
  return Math.max(1, Math.ceil(text.length / 4));
}

function factsToText(facts: AiFacts): string {
  return Object.entries(facts)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

/**
 * Per-(language, tone) opening lines and body phrases — deliberately a
 * small, explicit lookup table rather than a machine-translation call, so
 * the wording is predictable and reviewable. See AI-MARKETING.md "Message
 * generator" for why English/Urdu/Roman Urdu are each first-class here
 * (not a fallback-to-English), with the lookup structure left open for
 * more languages later.
 */
type LanguageKey = "english" | "urdu" | "roman_urdu";

const OPENERS: Record<LanguageKey, Record<string, string>> = {
  english: {
    friendly: "Hello {{customer_name}},",
    formal: "Dear {{customer_name}},",
    promotional: "{{customer_name}}, exciting news from {{shop_name}}!",
    informational: "{{customer_name}}, an update from {{shop_name}}:",
  },
  roman_urdu: {
    friendly: "Assalam-o-Alaikum {{customer_name}},",
    formal: "Mohtaram {{customer_name}},",
    promotional: "{{customer_name}}, {{shop_name}} ki taraf se khushkhabri!",
    informational: "{{customer_name}}, {{shop_name}} ki taraf se update:",
  },
  urdu: {
    friendly: "السلام علیکم {{customer_name}}،",
    formal: "محترم {{customer_name}}،",
    promotional: "{{customer_name}}, {{shop_name}} کی جانب سے خوشخبری!",
    informational: "{{customer_name}}, {{shop_name}} کی جانب سے اپڈیٹ:",
  },
};

const BODY_LINES: Record<LanguageKey, { newProduct: string; goldRate: string; inactive: string; generic: string; validUntil: string; defaultCta: string }> = {
  english: {
    newProduct: "{{shop_name}} has new {{product_name}} designs available.",
    goldRate: "Today's {{gold_rate}}.",
    inactive: "We've missed you at {{shop_name}} — take a look at what's new.",
    generic: "We have something we think you'll like at {{shop_name}}.",
    validUntil: "Valid until {{expiry_date}}.",
    defaultCta: "Would you like to see them?",
  },
  roman_urdu: {
    newProduct: "{{shop_name}} par naye {{product_name}} designs dastyab hain.",
    goldRate: "Aaj ka {{gold_rate}}.",
    inactive: "Hum ne aap ko {{shop_name}} par miss kiya — naya collection dekhiye.",
    generic: "{{shop_name}} par kuch khaas hai jo aap ko pasand aa sakta hai.",
    validUntil: "{{expiry_date}} tak valid.",
    defaultCta: "Kya aap dekhna chahenge?",
  },
  urdu: {
    newProduct: "{{shop_name}} پر نئے {{product_name}} ڈیزائن دستیاب ہیں۔",
    goldRate: "آج کا {{gold_rate}}۔",
    inactive: "ہم نے آپ کو {{shop_name}} پر یاد کیا — نیا کلیکشن دیکھیں۔",
    generic: "{{shop_name}} پر کچھ خاص ہے جو آپ کو پسند آسکتا ہے۔",
    validUntil: "{{expiry_date}} تک کارآمد۔",
    defaultCta: "کیا آپ دیکھنا چاہیں گے؟",
  },
};

function resolveLanguageKey(language?: string): LanguageKey {
  const normalized = (language ?? "english").toLowerCase().replace(/\s+/g, "_");
  if (normalized === "urdu") return "urdu";
  if (normalized === "roman_urdu" || normalized === "roman urdu") return "roman_urdu";
  return "english";
}

function buildCampaignMessage(facts: AiFacts, style?: GenerateTextInput["style"]): string {
  const languageKey = resolveLanguageKey(style?.language);
  const tone = (style?.tone ?? "friendly").toLowerCase();
  const opener = OPENERS[languageKey][tone] ?? OPENERS[languageKey].friendly;
  const body = BODY_LINES[languageKey];
  const lines: string[] = [opener];

  if (facts.productName) {
    lines.push(body.newProduct);
  } else if (facts.campaignType === "GOLD_RATE_UPDATE") {
    lines.push(body.goldRate);
  } else if (facts.campaignType === "INACTIVE_CUSTOMER") {
    lines.push(body.inactive);
  } else {
    lines.push(body.generic);
  }

  if (facts.offer) lines.push(`{{offer}}`);
  if (facts.expiryDate) lines.push(body.validUntil);

  const cta = facts.callToAction ? String(facts.callToAction) : body.defaultCta;
  lines.push(cta);

  return lines.join(" ");
}

function buildProductCaption(facts: AiFacts, platform: string): string {
  const parts: string[] = [];
  if (facts.productName) parts.push(String(facts.productName));
  if (facts.purity) parts.push(String(facts.purity));
  if (facts.netWeight) parts.push(`${facts.netWeight}g`);
  const summary = parts.join(" — ");

  switch (platform) {
    case "instagram":
      return `✨ ${summary} ✨\nCrafted with care at {{shop_name}}. ${facts.categoryName ?? "New piece"} now in store.`;
    case "facebook":
      return `${summary}\nAvailable now at {{shop_name}}. Visit us or send a message to know more.`;
    case "tiktok":
      return `${summary} 💛 #{{shop_name}}`;
    case "whatsapp":
      return `Assalam-o-Alaikum! {{shop_name}} has a new ${summary} available. Would you like more details?`;
    default:
      return summary;
  }
}

/**
 * Generic (non-product-specific) social content — see AI-MARKETING.md
 * "Social media content". Every line is generic, factual copy with no
 * numeric claim that isn't in `facts` — an educational/care/appreciation
 * post never states a price, a rate, or a return/investment claim.
 */
function buildSocialContent(facts: AiFacts): string {
  const contentType = String(facts.contentType ?? "");
  switch (contentType) {
    case "NEW_ARRIVAL":
      return `New arrival at {{shop_name}}: ${facts.productName ?? "a fresh design"} is now in store. Come take a look!`;
    case "PRODUCT_SPOTLIGHT":
      return `Product spotlight: ${facts.productName ?? "one of our pieces"}${facts.categoryName ? ` from our ${facts.categoryName} collection` : ""} — available now at {{shop_name}}.`;
    case "EDUCATIONAL":
      return "Did you know? Gold purity is measured in karats — 24K is pure gold, while 22K and 21K blend in other metals for extra durability. — {{shop_name}}";
    case "GOLD_KNOWLEDGE":
      return "A piece's value comes from its gold weight, purity, and craftsmanship together. Visit {{shop_name}} to learn what to look for in your next purchase.";
    case "JEWELRY_CARE":
      return "Keep your jewelry sparkling: store pieces separately, avoid contact with perfume and lotion, and clean gently with a soft cloth. — {{shop_name}}";
    case "FESTIVAL":
      return facts.festivalName
        ? `Celebrating ${facts.festivalName} with you — visit {{shop_name}} for the occasion.`
        : "Celebrate this festive season with {{shop_name}}.";
    case "BEHIND_THE_SCENES":
      return "A glimpse into the craftsmanship behind every piece at {{shop_name}}.";
    case "CUSTOMER_APPRECIATION":
      return "Thank you to our wonderful customers — {{shop_name}} is grateful for your continued trust.";
    default:
      return `An update from {{shop_name}}.`;
  }
}

function buildCustomerSummary(facts: AiFacts): string {
  const purchaseCount = Number(facts.purchaseCount ?? 0);
  if (purchaseCount === 0) {
    return `This customer has no completed purchases on record${facts.createdAt ? ` since joining on ${facts.createdAt}` : ""}.`;
  }
  const sentences: string[] = [];
  sentences.push(
    `Customer has made ${purchaseCount} purchase${purchaseCount === 1 ? "" : "s"}${
      facts.periodLabel ? ` in the ${facts.periodLabel}` : ""
    }${facts.totalSpending ? `, totaling Rs. ${facts.totalSpending}` : ""}.`,
  );
  if (facts.topCategory) sentences.push(`Most purchases were in ${facts.topCategory}.`);
  if (facts.daysSinceLastPurchase !== undefined && facts.daysSinceLastPurchase !== null) {
    sentences.push(`Their most recent purchase was ${facts.daysSinceLastPurchase} days ago.`);
  }
  if (facts.outstandingBalance && Number(facts.outstandingBalance) > 0) {
    sentences.push(`They currently have an outstanding balance of Rs. ${facts.outstandingBalance}.`);
  }
  return sentences.join(" ");
}

export class MockAiProvider implements AiProvider {
  readonly providerName = "mock";
  readonly model = "template-v1";

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    let text: string;
    switch (input.task) {
      case "campaign_message":
        text = buildCampaignMessage(input.facts, input.style);
        break;
      case "product_caption_instagram":
        text = buildProductCaption(input.facts, "instagram");
        break;
      case "product_caption_facebook":
        text = buildProductCaption(input.facts, "facebook");
        break;
      case "product_caption_tiktok":
        text = buildProductCaption(input.facts, "tiktok");
        break;
      case "product_caption_whatsapp":
        text = buildProductCaption(input.facts, "whatsapp");
        break;
      case "customer_summary":
        text = buildCustomerSummary(input.facts);
        break;
      case "social_content":
        text = buildSocialContent(input.facts);
        break;
      default:
        text = factsToText(input.facts);
    }
    if (input.style?.maxLength && text.length > input.style.maxLength) {
      text = text.slice(0, input.style.maxLength - 1).trimEnd() + "…";
    }
    return { text, inputTokens: estimateTokens(factsToText(input.facts)), outputTokens: estimateTokens(text) };
  }

  async generateStructuredOutput<T>(input: GenerateStructuredOutputInput<T>): Promise<GenerateStructuredOutputResult<T>> {
    // The mock provider never fabricates structured data out of nothing —
    // callers that need structured AI output pass the already-assembled
    // candidate object as a fact and this just validates it, mirroring
    // exactly what a real provider integration would still be required to
    // do (validate before use — see AI-ARCHITECTURE.md "Structured output").
    const candidate = input.facts.__candidate;
    let parsedCandidate: unknown = candidate;
    if (typeof candidate === "string") {
      try {
        parsedCandidate = JSON.parse(candidate);
      } catch {
        parsedCandidate = candidate;
      }
    }
    const result = (input.schema as z.ZodType<T>).parse(parsedCandidate);
    const text = JSON.stringify(result);
    return { data: result, inputTokens: estimateTokens(factsToText(input.facts)), outputTokens: estimateTokens(text) };
  }

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    const text = factsToText(input.facts).toLowerCase();
    let best = input.categories[0] ?? "UNKNOWN";
    let bestScore = -1;
    for (const category of input.categories) {
      const score = text.includes(category.toLowerCase()) ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = category;
      }
    }
    return {
      category: best,
      confidence: bestScore > 0 ? 0.9 : 0.4,
      inputTokens: estimateTokens(text),
      outputTokens: estimateTokens(best),
    };
  }

  async summarize(input: SummarizeInput): Promise<GenerateTextResult> {
    const text = buildCustomerSummary(input.facts);
    return { text, inputTokens: estimateTokens(factsToText(input.facts)), outputTokens: estimateTokens(text) };
  }
}

let sharedProvider: AiProvider | null = null;

/**
 * The single place application code resolves "the current AI provider" —
 * never `new MockAiProvider()` scattered around. Only "mock" is
 * implemented in Phase 7; the env var seam is prepared for a real provider
 * without any caller needing to change. See AI-ARCHITECTURE.md.
 */
export function getAiProvider(): AiProvider {
  if (!sharedProvider) {
    // AI_PROVIDER is read but only "mock" resolves to a real implementation
    // today — see AI-ARCHITECTURE.md "Do not build yet" for why a real
    // hosted provider isn't wired up in this phase.
    sharedProvider = new MockAiProvider();
  }
  return sharedProvider;
}
