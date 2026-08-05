export function digitsOnly(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = digitsOnly(phone);
  const base = clean ? `https://wa.me/${clean}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string): void {
  window.open(buildWhatsAppLink(phone, message), "_blank", "noopener,noreferrer");
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match));
}

export async function shareImageViaWebShare(
  imageDataUrl: string,
  text: string,
  title: string
): Promise<boolean> {
  try {
    if (!navigator.share || !navigator.canShare) return false;
    const res = await fetch(imageDataUrl);
    const blob = await res.blob();
    const ext = blob.type.split("/")[1] || "jpg";
    const file = new File([blob], `item.${ext}`, { type: blob.type });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], text, title });
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
