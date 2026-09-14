import Anthropic from "@anthropic-ai/sdk";
import type { ScoredLead } from "./types";
import { rationale } from "./scoring";
import { getCachedOutreach, setCachedOutreach } from "./cache";

/**
 * Personalized outreach drafting is the one place this project calls a real
 * LLM: numeric lead scoring (scoring.ts) is intentionally rule-based and
 * explainable, but writing persuasive, context-aware first-touch copy is
 * exactly what a generative model is good at. If ANTHROPIC_API_KEY isn't
 * configured, falls back to a deterministic template so the feature still
 * works end-to-end without any external dependency or cost.
 */

function fallbackEmail(lead: ScoredLead, senderName: string, senderCompany: string): string {
  const signal = lead.growthSignalList[0];
  const SIGNAL_PHRASES: Record<string, string> = {
    hiring: `has been hiring lately`,
    "new location opened": `just opened a new location`,
    "recent leadership change": `recently brought on new leadership`,
    "website redesign": `just refreshed its website`,
    "press mention": `has been picking up some press`,
    "expanded service area": `recently expanded its service area`,
  };
  const hook = signal
    ? `I noticed ${lead.company_name} ${SIGNAL_PHRASES[signal] ?? "has had some recent news"}`
    : `I've been researching ${lead.industry.toLowerCase()} companies in ${lead.city}, ${lead.state}`;
  return [
    `Subject: Quick question for ${lead.company_name}`,
    "",
    `Hi there,`,
    "",
    `${hook}, and it caught my attention.`,
    `${senderCompany} works with ${lead.industry.toLowerCase()} businesses like yours to help streamline operations and unlock growth — I'd love to share how, if it's relevant to what you're working on right now.`,
    "",
    `Worth a quick 15-minute call this week?`,
    "",
    `Best,`,
    senderName,
  ].join("\n");
}

export async function generateOutreachEmail(
  lead: ScoredLead,
  senderName: string,
  senderCompany: string
): Promise<{ email: string; source: "ai" | "template" }> {
  const cacheKey = `${lead.id}:${senderName}:${senderCompany}`;
  const cached = getCachedOutreach(cacheKey);
  if (cached) return { email: cached, source: "ai" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { email: fallbackEmail(lead, senderName, senderCompany), source: "template" };
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content:
            `Write a short, specific, non-generic cold outreach email (under 120 words, include a Subject line) ` +
            `from ${senderName} at ${senderCompany} to ${lead.company_name}, a ${lead.employee_count}-employee ` +
            `${lead.sub_industry} company in ${lead.city}, ${lead.state}. ` +
            `Context: ${lead.description} ` +
            (lead.growthSignalList.length ? `Recent signal: ${lead.growthSignalList[0]}. ` : "") +
            `Fit rationale: ${rationale(lead)} ` +
            `Tone: direct, respectful of their time, no hype/buzzwords, one clear call to action for a short call.`,
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text")?.text?.trim();
    if (!text) throw new Error("empty AI response");
    setCachedOutreach(cacheKey, text);
    return { email: text, source: "ai" };
  } catch {
    return { email: fallbackEmail(lead, senderName, senderCompany), source: "template" };
  }
}
