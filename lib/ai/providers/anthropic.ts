import Anthropic from "@anthropic-ai/sdk";
import { AIError, type AIProvider, type GenerateRequest } from "./types";

const DEFAULT_MODEL = "claude-opus-5";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    // The key stays on the server; it is never logged or sent to the browser.
    this.client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 });
    this.model = model?.trim() || DEFAULT_MODEL;
  }

  async generateJSON(req: GenerateRequest): Promise<unknown> {
    // Haiku 4.5 doesn't accept `effort` or server-side fallbacks.
    const isHaiku = this.model.startsWith("claude-haiku");
    let response;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 8000,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        output_config: {
          format: { type: "json_schema", schema: req.schema },
          // Short writing task: low effort keeps cost and latency down.
          ...(isHaiku ? {} : { effort: "low" as const }),
        },
        // If the model declines, the API retries on a recommended fallback model.
        ...(isHaiku ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
      });
    } catch (error) {
      throw toAIError(error);
    }

    if (response.stop_reason === "refusal") {
      throw new AIError("The AI declined to write messages for this lead. Please review the lead details and try again.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new AIError("The AI response was cut off. Please try again.");
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    try {
      return JSON.parse(text);
    } catch {
      throw new AIError("The AI returned an unexpected response. Please try again.");
    }
  }
}

function toAIError(error: unknown): AIError {
  // Log only the error type/status - never the request (which holds lead data) or the key.
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[ai] Anthropic authentication failed", error.status);
    return new AIError("The AI provider rejected the API key. Check ANTHROPIC_API_KEY in .env.local.", 502);
  }
  if (error instanceof Anthropic.RateLimitError) {
    console.error("[ai] Anthropic rate limit", error.status);
    return new AIError("The AI provider is busy (rate limit). Wait a minute and try again.", 503);
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error("[ai] Anthropic bad request", error.status, error.message);
    return new AIError("The AI request was rejected. Check the AI_MODEL setting or your account credit.", 502);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    console.error("[ai] Could not reach Anthropic");
    return new AIError("Couldn't reach the AI provider. Check your internet connection and try again.", 503);
  }
  if (error instanceof Anthropic.APIError) {
    console.error("[ai] Anthropic API error", error.status);
    return new AIError("The AI provider had a problem. Please try again in a moment.", 503);
  }
  console.error("[ai] Unexpected error", error instanceof Error ? error.name : typeof error);
  return new AIError("Something went wrong while generating messages. Please try again.", 500);
}
