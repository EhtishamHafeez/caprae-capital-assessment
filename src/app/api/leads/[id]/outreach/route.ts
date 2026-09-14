import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLeadById } from "@/lib/leads-repo";
import { generateOutreachEmail } from "@/lib/ai";

const bodySchema = z.object({
  senderName: z.string().min(1).max(80).default("Alex"),
  senderCompany: z.string().min(1).max(120).default("Our Company"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const lead = getLeadById(leadId);
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { senderName, senderCompany } = parsed.data;
  const result = await generateOutreachEmail(lead, senderName, senderCompany);
  return NextResponse.json(result);
}
