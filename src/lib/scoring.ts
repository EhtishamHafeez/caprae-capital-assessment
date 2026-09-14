import type { IcpFilters, Lead, ScoreBreakdown, ScoredLead } from "./types";

/**
 * Rule-based ICP-fit scoring engine (0-100), deliberately deterministic and
 * explainable rather than a black-box model: sales teams need to trust and
 * defend why a lead was prioritized. See README "Lead Scoring" for the
 * rationale, and lib/ai.ts for where generative AI is used instead (drafting
 * outreach copy), which is a better fit for an LLM than numeric scoring.
 */

function closenessToRange(value: number, min?: number, max?: number): number {
  if (min == null && max == null) return 1; // no target set -> neutral/full credit
  const lo = min ?? 0;
  const hi = max ?? Infinity;
  if (value >= lo && value <= hi) return 1;
  const span = hi === Infinity ? Math.max(lo, 1) : hi - lo || 1;
  const dist = value < lo ? lo - value : value - hi;
  return Math.max(0, 1 - dist / (span * 1.5));
}

export function scoreLead(lead: Lead, icp: IcpFilters): ScoredLead {
  const industryFit =
    !icp.industries?.length || icp.industries.includes(lead.industry)
      ? 25
      : icp.industries.some((i) => lead.industry.toLowerCase().includes(i.toLowerCase()))
        ? 15
        : 5;

  const revenueFit = Math.round(20 * closenessToRange(lead.estimated_revenue, icp.minRevenue, icp.maxRevenue));
  const employeeFit = Math.round(15 * closenessToRange(lead.employee_count, icp.minEmployees, icp.maxEmployees));

  let dataCompleteness = 0;
  if (lead.website) dataCompleteness += 5;
  if (lead.phone) dataCompleteness += 5;
  if (lead.contact_email) dataCompleteness += 3;
  if (lead.linkedin_url) dataCompleteness += 2;

  const growthSignalList = lead.growth_signals ? lead.growth_signals.split(";").filter(Boolean) : [];
  const growthSignals = Math.min(15, growthSignalList.length * 5);

  const age = new Date().getFullYear() - lead.founded_year;
  const maturity = age >= 5 ? 10 : Math.round((age / 5) * 10);

  const breakdown: ScoreBreakdown = { industryFit, revenueFit, employeeFit, dataCompleteness, growthSignals, maturity };
  const score = Math.min(100, industryFit + revenueFit + employeeFit + dataCompleteness + growthSignals + maturity);

  const tier: ScoredLead["tier"] = score >= 80 ? "Hot" : score >= 60 ? "Warm" : score >= 40 ? "Cool" : "Cold";

  return { ...lead, score, tier, breakdown, growthSignalList };
}

export function rationale(scored: ScoredLead): string {
  const parts: string[] = [];
  if (scored.breakdown.industryFit >= 20) parts.push("matches your target industry");
  if (scored.breakdown.revenueFit >= 15) parts.push("revenue is in your target range");
  if (scored.breakdown.employeeFit >= 12) parts.push("headcount fits your ICP");
  if (scored.breakdown.growthSignals >= 10) parts.push("showing active growth signals");
  if (scored.breakdown.dataCompleteness >= 12) parts.push("has complete, actionable contact data");
  if (!parts.length) parts.push("only a partial fit against your current filters");
  return `${scored.company_name} scored ${scored.score}/100 (${scored.tier}) — ${parts.join(", ")}.`;
}
