import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLeadById } from "@/lib/leads-repo";
import { generateOutreachEmail } from "@/lib/ai";
import { errorResponse, rateLimitResponse } from "@/lib/api-error";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

const bodySchema = z.object({
  senderName: z.string().min(1).max(80).default("Alex"),
  senderCompany: z.string().min(1).max(120).default("Our Company"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit(`outreach:${getClientKey(req)}`, 20, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds!);

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return errorResponse("Invalid lead id.", 400);

  const lead = getLeadById(leadId);
  if (!lead) return errorResponse("Lead not found.", 404);

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("Invalid request body.", 400, { details: parsed.error.flatten() });

  const { senderName, senderCompany } = parsed.data;
  const result = await generateOutreachEmail(lead, senderName, senderCompany);
  return NextResponse.json(result);
}
