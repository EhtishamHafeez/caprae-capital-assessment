import { NextResponse } from "next/server";
import { getLeadById, getSavedLeadIds } from "@/lib/leads-repo";

export async function GET() {
  const ids = getSavedLeadIds();
  const leads = ids.map((id) => getLeadById(id)).filter(Boolean);
  return NextResponse.json({ leads });
}
