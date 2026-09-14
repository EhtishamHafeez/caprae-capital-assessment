import { NextRequest } from "next/server";
import { getLeadById, getSavedLeadIds, queryLeads } from "@/lib/leads-repo";
import { parseFilters } from "@/lib/parse-filters";
import type { ScoredLead } from "@/lib/types";

const HEADERS = [
  "company_name", "industry", "sub_industry", "city", "state", "website", "phone",
  "contact_email", "employee_count", "estimated_revenue", "founded_year", "linkedin_url",
  "score", "tier", "growth_signals", "source",
] as const;

function toCsv(leads: ScoredLead[]): string {
  const rows = leads.map((l) =>
    HEADERS.map((h) => {
      const v = String((l as unknown as Record<string, unknown>)[h] ?? "");
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(",")
  );
  return [HEADERS.join(","), ...rows].join("\n");
}

export async function GET(req: NextRequest) {
  const savedOnly = req.nextUrl.searchParams.get("saved") === "1";
  let leads: ScoredLead[];

  if (savedOnly) {
    const ids = getSavedLeadIds();
    leads = ids.map((id) => getLeadById(id)).filter((l): l is ScoredLead => !!l);
  } else {
    const filters = parseFilters(req.nextUrl.searchParams);
    leads = queryLeads({ ...filters, page: 1, pageSize: 10_000 }).leads;
  }

  const csv = toCsv(leads);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
}
