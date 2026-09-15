import { getDb } from "./db";
import { scoreLead } from "./scoring";
import { cachedQuery } from "./cache";
import type { IcpFilters, Lead, ScoredLead } from "./types";

export interface LeadsResult {
  leads: ScoredLead[];
  total: number;
  page: number;
  pageSize: number;
}

function fetchAll(industries?: string[], states?: string[], q?: string): Lead[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (industries?.length) {
    clauses.push(`industry IN (${industries.map((_, i) => `@ind${i}`).join(",")})`);
    industries.forEach((v, i) => (params[`ind${i}`] = v));
  }
  if (states?.length) {
    clauses.push(`state IN (${states.map((_, i) => `@st${i}`).join(",")})`);
    states.forEach((v, i) => (params[`st${i}`] = v));
  }
  if (q) {
    clauses.push(`(lower(company_name) LIKE @q OR lower(description) LIKE @q OR lower(sub_industry) LIKE @q)`);
    params.q = `%${q.toLowerCase()}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM leads ${where} ORDER BY id`).all(params) as Lead[];
}

export function queryLeads(filters: IcpFilters): LeadsResult {
  const cacheKey = JSON.stringify(filters);
  return cachedQuery(cacheKey, () => {
    let raw = fetchAll(filters.industries, filters.states, filters.q?.trim());

    // Revenue/employee bounds are hard cutoffs, not just a scoring hint —
    // a lead below a stated "$5M+" floor must not appear just because it
    // scored well on other dimensions. (scoreLead's closeness-to-range
    // credit still runs on the filtered set below, rewarding how centered
    // a lead is within the range rather than whether it qualifies at all.)
    if (filters.minRevenue != null) raw = raw.filter((l) => l.estimated_revenue >= filters.minRevenue!);
    if (filters.maxRevenue != null) raw = raw.filter((l) => l.estimated_revenue <= filters.maxRevenue!);
    if (filters.minEmployees != null) raw = raw.filter((l) => l.employee_count >= filters.minEmployees!);
    if (filters.maxEmployees != null) raw = raw.filter((l) => l.employee_count <= filters.maxEmployees!);

    let scored = raw.map((lead) => scoreLead(lead, filters));

    if (filters.minScore != null) scored = scored.filter((l) => l.score >= filters.minScore!);

    const sortBy = filters.sortBy ?? "score";
    const dir = filters.sortDir === "asc" ? 1 : -1;
    scored.sort((a, b) => {
      switch (sortBy) {
        case "revenue": return (a.estimated_revenue - b.estimated_revenue) * dir;
        case "employees": return (a.employee_count - b.employee_count) * dir;
        case "name": return a.company_name.localeCompare(b.company_name) * dir;
        default: return (a.score - b.score) * dir;
      }
    });

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    const start = (page - 1) * pageSize;
    const pageItems = scored.slice(start, start + pageSize);

    return { leads: pageItems, total: scored.length, page, pageSize };
  });
}

export function getLeadById(id: number, filters: IcpFilters = {}): ScoredLead | undefined {
  const db = getDb();
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead | undefined;
  return lead ? scoreLead(lead, filters) : undefined;
}

export function toggleSaved(id: number): boolean {
  const db = getDb();
  const existing = db.prepare("SELECT lead_id FROM saved_leads WHERE lead_id = ?").get(id);
  if (existing) {
    db.prepare("DELETE FROM saved_leads WHERE lead_id = ?").run(id);
    return false;
  }
  db.prepare("INSERT INTO saved_leads (lead_id, saved_at) VALUES (?, ?)").run(id, new Date().toISOString());
  return true;
}

export function getSavedLeadIds(): number[] {
  const db = getDb();
  return (db.prepare("SELECT lead_id FROM saved_leads").all() as { lead_id: number }[]).map((r) => r.lead_id);
}

export function getMeta() {
  const db = getDb();
  const industries = (db.prepare("SELECT DISTINCT industry FROM leads ORDER BY industry").all() as { industry: string }[]).map((r) => r.industry);
  const states = (db.prepare("SELECT DISTINCT state FROM leads ORDER BY state").all() as { state: string }[]).map((r) => r.state);
  return { industries, states };
}
