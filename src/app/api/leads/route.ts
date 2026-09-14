import { NextRequest, NextResponse } from "next/server";
import { queryLeads } from "@/lib/leads-repo";
import { parseFilters } from "@/lib/parse-filters";

export async function GET(req: NextRequest) {
  const filters = parseFilters(req.nextUrl.searchParams);
  const result = queryLeads(filters);
  return NextResponse.json(result);
}
