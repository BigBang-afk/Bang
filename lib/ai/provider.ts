import "server-only";
import { AnthropicProvider } from "./providers/anthropic";
import { DemoProvider } from "./providers/demo";
import type { AIProvider } from "./providers/types";

/**
 * Picks the AI provider from environment variables.
 * AI_PROVIDER=anthropic|demo. If unset: anthropic when ANTHROPIC_API_KEY exists, else demo.
 */
export function getAIProvider(): AIProvider {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const choice = (process.env.AI_PROVIDER?.trim().toLowerCase() || (key ? "anthropic" : "demo")) as string;

  switch (choice) {
    case "anthropic":
      if (!key) return new DemoProvider();
      return new AnthropicProvider(key, process.env.AI_MODEL);
    case "demo":
      return new DemoProvider();
    default:
      console.warn(`[ai] Unknown AI_PROVIDER "${choice}", falling back to demo mode`);
      return new DemoProvider();
  }
}

export function isDemoMode(): boolean {
  return getAIProvider().name === "demo";
}
