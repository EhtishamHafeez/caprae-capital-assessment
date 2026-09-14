import { NextRequest, NextResponse } from "next/server";
import { toggleSaved } from "@/lib/leads-repo";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const saved = toggleSaved(leadId);
  return NextResponse.json({ saved });
}
