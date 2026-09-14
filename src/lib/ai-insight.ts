import { AI_TIMEOUT_MS, CLAUDE_MODEL, getAnthropicClient } from "./ai-client";
import { makeAiCache } from "./cache";
import { rationale } from "./scoring";
import type { ScoredLead } from "./types";

/**
 * The numeric score (scoring.ts) says *how well* a lead fits; this generates
 * a couple of sentences of qualitative judgment on *why it's worth a rep's
 * time and how to approach it* — reading the company description and growth
 * signals the way an experienced SDR would, not just re-stating the score
 * breakdown in prose. Falls back to an extended version of the deterministic
 * rationale() when no API key is configured.
 */

const insightCache = makeAiCache(500, 1000 * 60 * 60 * 24);

export interface LeadInsight {
  insight: string;
  source: "ai" | "template";
}

function fallbackInsight(lead: ScoredLead): string {
  const base = rationale(lead);
  const angle = lead.growthSignalList.length
    ? `Lead with "${lead.growthSignalList[0]}" as the opener — it's a concrete, current reason to reach out.`
    : `No recent signal to hook on to; lead with a direct, research-based opener instead.`;
  return `${base} ${angle}`;
}

export async function generateLeadInsight(lead: ScoredLead): Promise<LeadInsight> {
  const cacheKey = `${lead.id}:${lead.score}`;
  const cached = insightCache.get(cacheKey);
  if (cached) return { insight: cached, source: "ai" };

  const client = getAnthropicClient();
  if (!client) return { insight: fallbackInsight(lead), source: "template" };

  try {
    const msg = await client.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: 220,
        messages: [
          {
            role: "user",
            content:
              `You are a sales development advisor. In 2-3 sentences, give a sharp, specific read on this lead — ` +
              `not a restatement of its stats. Cover: is it actually worth prioritizing and why, any risk or caveat ` +
              `a rep should know before reaching out, and the single best angle to open with.\n\n` +
              `Company: ${lead.company_name} (${lead.sub_industry}, ${lead.city}, ${lead.state})\n` +
              `${lead.employee_count} employees, ~$${Math.round(lead.estimated_revenue / 1000)}K est. revenue, founded ${lead.founded_year}\n` +
              `Description: ${lead.description}\n` +
              `Growth signals: ${lead.growthSignalList.join(", ") || "none detected"}\n` +
              `ICP-fit score: ${lead.score}/100 (${lead.tier})\n` +
              `Contact data available: ${[lead.website && "website", lead.phone && "phone", lead.contact_email && "email", lead.linkedin_url && "LinkedIn"].filter(Boolean).join(", ") || "none"}\n\n` +
              `Be direct and specific to this company, not generic sales advice.`,
          },
        ],
      },
      { timeout: AI_TIMEOUT_MS }
    );
    const text = msg.content.find((b) => b.type === "text")?.text?.trim();
    if (!text) throw new Error("empty AI response");
    insightCache.set(cacheKey, text);
    return { insight: text, source: "ai" };
  } catch {
    return { insight: fallbackInsight(lead), source: "template" };
  }
}
