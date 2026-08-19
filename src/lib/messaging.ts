import "server-only";

/**
 * Messaging is provider-agnostic and NEVER simulates delivery. Unless a real
 * provider is configured via environment variables, sends are rejected with
 * a clear "not configured" error and the recipient/campaign is marked
 * FAILED — nothing is ever silently marked as sent.
 *
 * To go live, set MESSAGING_PROVIDER and the matching credentials in .env,
 * see .env.example.
 */

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface MessagingProvider {
  id: string;
  send(toMobile: string, body: string, channel: "SMS" | "WHATSAPP"): Promise<SendResult>;
}

class UnconfiguredProvider implements MessagingProvider {
  id = "none";
  async send(): Promise<SendResult> {
    return {
      success: false,
      error:
        "No messaging provider is configured. Set MESSAGING_PROVIDER and the matching " +
        "credentials (see .env.example) in the environment before sending messages.",
    };
  }
}

class TwilioProvider implements MessagingProvider {
  id = "twilio";

  async send(toMobile: string, body: string, channel: "SMS" | "WHATSAPP"): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = channel === "WHATSAPP" ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
      return { success: false, error: "Twilio credentials are not fully configured." };
    }

    const to = channel === "WHATSAPP" ? `whatsapp:${toMobile}` : toMobile;
    const fromAddr = channel === "WHATSAPP" ? `whatsapp:${from}` : from;

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: to, From: fromAddr, Body: body }).toString(),
        },
      );
      const data = (await res.json()) as { sid?: string; message?: string };
      if (!res.ok) {
        return { success: false, error: data.message ?? `Twilio error (HTTP ${res.status})` };
      }
      return { success: true, providerMessageId: data.sid };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Twilio request failed" };
    }
  }
}

class WhatsAppCloudProvider implements MessagingProvider {
  id = "whatsapp_cloud";

  async send(toMobile: string, body: string): Promise<SendResult> {
    const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return { success: false, error: "WhatsApp Cloud API credentials are not fully configured." };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: toMobile.replace(/[^\d+]/g, ""),
            type: "text",
            text: { body },
          }),
        },
      );
      const data = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message: string };
      };
      if (!res.ok) {
        return { success: false, error: data.error?.message ?? `WhatsApp API error (HTTP ${res.status})` };
      }
      return { success: true, providerMessageId: data.messages?.[0]?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "WhatsApp request failed" };
    }
  }
}

export function getMessagingProvider(): MessagingProvider {
  const providerId = process.env.MESSAGING_PROVIDER ?? "none";
  switch (providerId) {
    case "twilio":
      return new TwilioProvider();
    case "whatsapp_cloud":
      return new WhatsAppCloudProvider();
    default:
      return new UnconfiguredProvider();
  }
}

const PLACEHOLDER_PATTERN = /\{(customer_name|gold_rate|store_name|phone|date)\}/g;

export interface TemplateContext {
  customer_name: string;
  gold_rate?: string;
  store_name: string;
  phone: string;
  date: string;
}

export function renderTemplate(body: string, context: TemplateContext): string {
  return body.replace(PLACEHOLDER_PATTERN, (_, key: keyof TemplateContext) => {
    return context[key] ?? "";
  });
}
