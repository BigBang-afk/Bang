export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productInquiryMessage(productName: string, sku: string): string {
  return `Hello Zarghoon Jewellers, I am interested in ${productName}. Product ID: ${sku}. Please provide more details.`;
}
