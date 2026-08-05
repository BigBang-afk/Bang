import { useEffect, useMemo, useState } from "react";
import { X, Share2, Send, Copy, Check, Shuffle, ImageOff } from "lucide-react";
import type { Product } from "../store/inventoryStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { useCustomerStore } from "../store/customerStore";
import { useMarketingStore } from "../store/marketingStore";
import { computeProductPrice } from "../lib/pricing";
import { formatMoney } from "../lib/format";
import { openWhatsApp, renderTemplate, shareImageViaWebShare, copyText } from "../lib/whatsapp";
import ProductThumb from "./ProductThumb";

export default function ShareItemModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const rates = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);
  const shop = useSettingsStore();
  const customers = useCustomerStore((s) => s.customers);
  const templates = useMarketingStore((s) => s.templates);
  const quotes = useMarketingStore((s) => s.quotes);

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [quote, setQuote] = useState(
    () => quotes[Math.floor(Math.random() * quotes.length)] ?? ""
  );
  const [customerId, setCustomerId] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const customer = customers.find((c) => c.id === customerId) ?? null;

  const vars = useMemo(() => {
    const price = computeProductPrice(product, rates);
    return {
      shopName: shop.shopName,
      shopAddress: shop.shopAddress,
      shopPhone: shop.shopPhone,
      itemName: product.name,
      category: product.category,
      grossWeight: `${product.grossWeightGrams.toFixed(2)}g`,
      rate: `${formatMoney(rates.k21, currency)}/g`,
      price: formatMoney(price.total, currency),
      quote,
      customerName: customer?.name || "there",
    };
  }, [product, rates, currency, shop, quote, customer]);

  const [message, setMessage] = useState(() => renderTemplate(template?.body ?? "", vars));

  useEffect(() => {
    setMessage(renderTemplate(template?.body ?? "", vars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, quote, customerId]);

  function shuffleQuote() {
    if (quotes.length === 0) return;
    let next = quote;
    if (quotes.length > 1) {
      while (next === quote) {
        next = quotes[Math.floor(Math.random() * quotes.length)];
      }
    }
    setQuote(next);
  }

  async function handleCopy() {
    const ok = await copyText(message);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function handleShareImage() {
    setShareNotice("");
    const img = product.images[0];
    if (!img) {
      setShareNotice("This item has no photo yet — add one in Inventory to share with image.");
      return;
    }
    const ok = await shareImageViaWebShare(img, message, product.name);
    if (!ok) {
      setShareNotice(
        "Image sharing isn't supported in this browser. Use Copy Message, then Send via WhatsApp and attach the photo manually."
      );
    }
  }

  function handleSendWhatsApp() {
    openWhatsApp(customer?.phone ?? "", message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-gold-100">
            <Share2 size={18} className="text-gold-300" /> Share on WhatsApp
          </h3>
          <button onClick={onClose} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-3 rounded-lg border border-gold-900/40 bg-ink-900/40 p-3">
            <ProductThumb images={product.images} size={48} />
            <div className="min-w-0">
              <div className="truncate font-medium text-[#ece6d9]">{product.name}</div>
              <div className="text-xs text-ink-500">
                {product.category} · {product.grossWeightGrams.toFixed(2)}g ·{" "}
                {formatMoney(computeProductPrice(product, rates).total, currency)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Template
              </span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="input"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Send to (optional)
              </span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input"
              >
                <option value="">Open contact picker</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Message
              </span>
              <button
                type="button"
                onClick={shuffleQuote}
                className="flex items-center gap-1 text-xs font-medium text-gold-500 hover:text-gold-300"
              >
                <Shuffle size={12} /> Shuffle quote
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={9}
              className="input resize-none font-mono text-xs leading-relaxed"
            />
          </div>

          {shareNotice && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
              <ImageOff size={14} className="mt-0.5 shrink-0" /> {shareNotice}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-gold-900/40 px-6 py-4">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gold-900/50 py-2.5 text-xs font-semibold text-[#c9bd9e] hover:border-gold-700"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleShareImage}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gold-900/50 py-2.5 text-xs font-semibold text-[#c9bd9e] hover:border-gold-700"
          >
            <Share2 size={14} /> With Photo
          </button>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-xs font-semibold text-white hover:from-emerald-500 hover:to-emerald-400"
          >
            <Send size={14} /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
