import { NextRequest, NextResponse } from "next/server";
import { getLeadById } from "@/lib/leads-repo";
import { generateLeadInsight } from "@/lib/ai-insight";
import { errorResponse, rateLimitResponse } from "@/lib/api-error";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { parseFilters } from "@/lib/parse-filters";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit(`insight:${getClientKey(req)}`, 20, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds!);

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return errorResponse("Invalid lead id.", 400);

  // Score against the same ICP filters the client currently has applied, so
  // the insight is grounded in the score the user is actually looking at.
  const filters = parseFilters(req.nextUrl.searchParams);
  const lead = getLeadById(leadId, filters);
  if (!lead) return errorResponse("Lead not found.", 404);

  const result = await generateLeadInsight(lead);
  return NextResponse.json(result);
}
