import Anthropic from "@anthropic-ai/sdk";

// All AI calls go through server routes; the API key never reaches the client.

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new AiNotConfiguredError();
    }
    _client = new Anthropic();
  }
  return _client;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Add it to .env to enable AI features.");
    this.name = "AiNotConfiguredError";
  }
}

// Strong model: grading, module generation, briefs, deep dives.
export const MODEL_STRONG = process.env.AI_MODEL_STRONG ?? "claude-opus-4-8";
// Light model: gap suggestions, alt text, simple generation (cost control).
export const MODEL_LIGHT = process.env.AI_MODEL_LIGHT ?? "claude-haiku-4-5";

interface StructuredCallOptions {
  model: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}

// Structured JSON generation with schema enforcement plus a retry pass for
// malformed output (belt and braces — output_config.format guarantees valid
// JSON, but the retry also covers transient API failures).
export async function structuredCall<T>(opts: StructuredCallOptions): Promise<T> {
  const client = anthropic();
  const maxTokens = opts.maxTokens ?? 16000;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Structured outputs via the SDK's beta surface (output_format is the
      // schema-enforced JSON format supported by @anthropic-ai/sdk 0.70.x).
      const response = await client.beta.messages.create({
        model: opts.model,
        max_tokens: maxTokens,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
        output_format: { type: "json_schema", schema: opts.schema },
      });

      if (response.stop_reason === "refusal") {
        throw new Error("The model declined this request.");
      }
      const text = response.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new Error("Empty AI response");
      return JSON.parse(text.text) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof Anthropic.BadRequestError) throw err; // won't improve on retry
    }
  }
  throw lastError;
}
