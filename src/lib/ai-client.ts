import Anthropic from "@anthropic-ai/sdk";

// Every AI feature in this app (outreach drafting, natural-language search,
// lead insights) shares one client instance and one timeout policy, and all
// of them are designed to degrade to a deterministic fallback rather than
// ever hard-fail a request — see each feature module for its specific
// fallback. Centralizing the client here means the "is AI configured" check
// and the request timeout live in exactly one place.

let client: Anthropic | null | undefined;

export function getAnthropicClient(): Anthropic | null {
  if (client !== undefined) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  client = apiKey ? new Anthropic({ apiKey }) : null;
  return client;
}

export const CLAUDE_MODEL = "claude-sonnet-5";

/** Anthropic calls get 12s to complete before we fall back — keeps a slow/down API from hanging a request. */
export const AI_TIMEOUT_MS = 12_000;
