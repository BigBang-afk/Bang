import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
}

export type TemplateInput = Pick<MessageTemplate, "name" | "body">;

export interface Campaign {
  id: string;
  name: string;
  message: string;
  productId: string | null;
  productName: string | null;
  customerIds: string[];
  sentCustomerIds: string[];
  createdAt: string;
}

export type CampaignInput = Pick<Campaign, "name" | "message" | "productId" | "productName" | "customerIds">;

const DEFAULT_TEMPLATE_BODY = `✨ *{shopName}* ✨

*{itemName}*
Category: {category}
Gross Weight: {grossWeight}
Today's 21K Rate: {rate}
Price: {price}

"{quote}"

📍 {shopAddress}
📞 {shopPhone}

Reply to this message or visit us to make it yours today!`;

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  { id: "default", name: "New Item Showcase", body: DEFAULT_TEMPLATE_BODY },
  {
    id: "general-promo",
    name: "General Promotion",
    body: `✨ *{shopName}* ✨

We have beautiful new gold jewellery pieces waiting for you!

Today's 21K Rate: {rate}

"{quote}"

📍 {shopAddress}
📞 {shopPhone}

Visit us today or reply to this message to know more!`,
  },
];

export const DEFAULT_QUOTES: string[] = [
  "Gold is not just an investment, it's a legacy you wear.",
  "Every piece tells a story — let this one be yours.",
  "Elegance is the only beauty that never fades.",
  "Treat yourself, you deserve to shine today.",
  "The best time to buy gold was yesterday. The next best time is now.",
  "Timeless gold for your timeless moments.",
  "A little sparkle a day keeps the dull days away.",
  "Invest in gold, invest in forever.",
  "Beauty fades, gold shines forever.",
  "Make every occasion golden.",
  "Your perfect piece is waiting — don't let it wait too long.",
  "Gold never goes out of style, and neither will you.",
  "Celebrate life's golden moments with us.",
  "Simplicity and gold — the perfect pair.",
  "Own a piece of timeless craftsmanship today.",
];

interface MarketingState {
  templates: MessageTemplate[];
  quotes: string[];
  campaigns: Campaign[];
  addTemplate: (input: TemplateInput) => void;
  updateTemplate: (id: string, patch: Partial<TemplateInput>) => void;
  removeTemplate: (id: string) => void;
  addQuote: (quote: string) => void;
  removeQuote: (quote: string) => void;
  createCampaign: (input: CampaignInput) => Campaign;
  markSent: (campaignId: string, customerId: string) => void;
  unmarkSent: (campaignId: string, customerId: string) => void;
  removeCampaign: (id: string) => void;
}

export const useMarketingStore = create<MarketingState>()(
  persist(
    (set) => ({
      templates: DEFAULT_TEMPLATES,
      quotes: DEFAULT_QUOTES,
      campaigns: [],
      addTemplate: (input) =>
        set((state) => ({
          templates: [...state.templates, { id: crypto.randomUUID(), ...input }],
        })),
      updateTemplate: (id, patch) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTemplate: (id) =>
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),
      addQuote: (quote) =>
        set((state) => {
          const trimmed = quote.trim();
          if (!trimmed || state.quotes.includes(trimmed)) return state;
          return { quotes: [...state.quotes, trimmed] };
        }),
      removeQuote: (quote) =>
        set((state) => ({ quotes: state.quotes.filter((q) => q !== quote) })),
      createCampaign: (input) => {
        const campaign: Campaign = {
          id: crypto.randomUUID(),
          ...input,
          sentCustomerIds: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
        return campaign;
      },
      markSent: (campaignId, customerId) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === campaignId && !c.sentCustomerIds.includes(customerId)
              ? { ...c, sentCustomerIds: [...c.sentCustomerIds, customerId] }
              : c
          ),
        })),
      unmarkSent: (campaignId, customerId) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === campaignId
              ? { ...c, sentCustomerIds: c.sentCustomerIds.filter((id) => id !== customerId) }
              : c
          ),
        })),
      removeCampaign: (id) =>
        set((state) => ({ campaigns: state.campaigns.filter((c) => c.id !== id) })),
    }),
    { name: "zarghoon-marketing" }
  )
);
