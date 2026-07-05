import { HttpsProxyAgent } from "https-proxy-agent";

/** Respects HTTPS_PROXY/https_proxy if set (e.g. behind a corporate/sandbox egress proxy); otherwise connects directly. */
export function proxyAwareWsOptions(): { agent?: HttpsProxyAgent<string> } {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxyUrl) return {};
  return { agent: new HttpsProxyAgent(proxyUrl) };
}
