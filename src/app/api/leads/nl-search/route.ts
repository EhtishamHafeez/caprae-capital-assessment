import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseNaturalLanguageQuery } from "@/lib/ai-search";
import { getMeta } from "@/lib/leads-repo";
import { errorResponse, rateLimitResponse } from "@/lib/api-error";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

const bodySchema = z.object({
  query: z.string().min(2).max(300),
});

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`nl-search:${getClientKey(req)}`, 20, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds!);

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("Invalid request body.", 400, { details: parsed.error.flatten() });

  const meta = getMeta();
  const result = await parseNaturalLanguageQuery(parsed.data.query, meta);
  return NextResponse.json(result);
}
