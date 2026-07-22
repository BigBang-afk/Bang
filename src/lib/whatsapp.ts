import { formatPKR, formatWeight } from "@/lib/utils";
import type { GoldPurity } from "@/lib/constants";

/** Strips everything but digits, keeping a leading "92..." country-coded number for wa.me links. */
export function normalizeWhatsAppNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const number = normalizeWhatsAppNumber(phoneNumber);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function genericInquiryMessage(): string {
  return "Assalam-o-Alaikum, I am interested in your jewelry collection at Zarghoon Jewellers. Please share more details.";
}

export function productInquiryMessage(params: {
  productName: string;
  productCode: string;
  purity: GoldPurity;
  grossWeightGrams: string | number;
  displayPrice: string;
  productUrl: string;
}): string {
  return [
    "Assalam-o-Alaikum, I am interested in this product from Zarghoon Jewellers.",
    `Product Name: ${params.productName}`,
    `Product Code: ${params.productCode}`,
    `Gold Purity: ${params.purity}`,
    `Gross Weight: ${formatWeight(params.grossWeightGrams)}`,
    `Current Display Price: ${params.displayPrice}`,
    `Product Link: ${params.productUrl}`,
    "Please confirm the latest price and availability.",
  ].join("\n");
}

export function customOrderMessage(): string {
  return "Assalam-o-Alaikum, I would like to request a custom jewelry design from Zarghoon Jewellers. Please guide me through the process.";
}

export function goldRatesInquiryMessage(): string {
  return "Assalam-o-Alaikum, I would like to confirm today's gold rates at Zarghoon Jewellers before visiting.";
}

export function calculatorEstimateMessage(params: {
  purity: GoldPurity;
  grossWeightGrams: number;
  estimatedPrice: number;
}): string {
  return [
    "Assalam-o-Alaikum, I used the gold calculator on your website and would like to confirm this estimate.",
    `Gold Purity: ${params.purity}`,
    `Weight: ${formatWeight(params.grossWeightGrams)}`,
    `Estimated Price: ${formatPKR(params.estimatedPrice)}`,
    "Please confirm the final price.",
  ].join("\n");
}
