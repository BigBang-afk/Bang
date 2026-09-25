export interface GenerateRequest {
  system: string;
  user: string;
  /** JSON schema the response must follow. */
  schema: Record<string, unknown>;
}

/** Every AI provider implements this. Add a new provider by adding a file and a case in ../provider.ts. */
export interface AIProvider {
  readonly name: string;
  /** Returns the parsed JSON object produced by the model (validated by the caller). */
  generateJSON(req: GenerateRequest): Promise<unknown>;
}

/** Errors that are safe to show to the agent. */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502,
  ) {
    super(message);
    this.name = "AIError";
  }
}
