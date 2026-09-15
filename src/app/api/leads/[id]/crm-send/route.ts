import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLeadById } from "@/lib/leads-repo";
import { errorResponse, rateLimitResponse } from "@/lib/api-error";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { isSafeWebhookUrl } from "@/lib/webhook-validation";

const bodySchema = z.object({
  webhookUrl: z.string().url().max(2000),
});

const WEBHOOK_TIMEOUT_MS = 8_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit(`crm-send:${getClientKey(req)}`, 20, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds!);

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return errorResponse("Invalid lead id.", 400);

  const lead = getLeadById(leadId);
  if (!lead) return errorResponse("Lead not found.", 404);

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("Invalid request body.", 400, { details: parsed.error.flatten() });

  const { webhookUrl } = parsed.data;
  if (!isSafeWebhookUrl(webhookUrl)) {
    return errorResponse("That webhook URL isn't allowed — it must be a public https:// endpoint.", 400);
  }

  const payload = {
    source: "LeadPilot",
    sent_at: new Date().toISOString(),
    lead: {
      company_name: lead.company_name,
      industry: lead.industry,
      sub_industry: lead.sub_industry,
      city: lead.city,
      state: lead.state,
      website: lead.website,
      phone: lead.phone,
      contact_email: lead.contact_email,
      employee_count: lead.employee_count,
      estimated_revenue: lead.estimated_revenue,
      founded_year: lead.founded_year,
      linkedin_url: lead.linkedin_url,
      growth_signals: lead.growthSignalList,
      description: lead.description,
      icp_score: lead.score,
      icp_tier: lead.tier,
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return errorResponse(`The webhook responded with an error (HTTP ${res.status}).`, 502);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("crm-send: webhook delivery failed", err);
    return errorResponse("Couldn't reach that webhook URL — check it's correct and try again.", 502);
  }
}
