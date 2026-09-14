import { describe, expect, it } from "vitest";
import { rationale, scoreLead } from "./scoring";
import type { Lead } from "./types";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 1,
    company_name: "Acme Widgets",
    industry: "Manufacturing",
    sub_industry: "Metal Fabrication",
    city: "Columbus",
    state: "OH",
    website: "https://www.acmewidgets.com",
    phone: "(555) 123-4567",
    contact_email: "info@acmewidgets.com",
    employee_count: 50,
    estimated_revenue: 5_000_000,
    founded_year: new Date().getFullYear() - 10,
    linkedin_url: "https://www.linkedin.com/company/acmewidgets",
    growth_signals: "hiring;website redesign",
    source: "Google Maps",
    description: "A metal fabrication company.",
    ...overrides,
  };
}

describe("scoreLead", () => {
  it("gives a perfect complete-data lead full marks in an empty ICP (no filters set)", () => {
    const scored = scoreLead(makeLead({ growth_signals: "hiring;website redesign;press mention" }), {});
    expect(scored.score).toBe(100);
    expect(scored.tier).toBe("Hot");
  });

  it("awards full industry fit only when industry is in the target list", () => {
    const inList = scoreLead(makeLead(), { industries: ["Manufacturing", "Construction"] });
    const notInList = scoreLead(makeLead(), { industries: ["Healthcare Services"] });
    expect(inList.breakdown.industryFit).toBe(25);
    expect(notInList.breakdown.industryFit).toBeLessThan(25);
  });

  it("gives neutral (full) industry credit when no industries are targeted", () => {
    const scored = scoreLead(makeLead(), {});
    expect(scored.breakdown.industryFit).toBe(25);
  });

  it("scores revenue fit highest when inside the target range, lower outside it", () => {
    const inRange = scoreLead(makeLead({ estimated_revenue: 5_000_000 }), { minRevenue: 1_000_000, maxRevenue: 10_000_000 });
    const outOfRange = scoreLead(makeLead({ estimated_revenue: 50_000_000 }), { minRevenue: 1_000_000, maxRevenue: 10_000_000 });
    expect(inRange.breakdown.revenueFit).toBe(20);
    expect(outOfRange.breakdown.revenueFit).toBeLessThan(20);
  });

  it("degrades revenue fit further the more distant the value is from the target range", () => {
    const slightlyOver = scoreLead(makeLead({ estimated_revenue: 11_000_000 }), { minRevenue: 1_000_000, maxRevenue: 10_000_000 });
    const wayOver = scoreLead(makeLead({ estimated_revenue: 100_000_000 }), { minRevenue: 1_000_000, maxRevenue: 10_000_000 });
    expect(slightlyOver.breakdown.revenueFit).toBeGreaterThan(wayOver.breakdown.revenueFit);
  });

  it("scores employee fit the same way as revenue fit (range closeness)", () => {
    const inRange = scoreLead(makeLead({ employee_count: 50 }), { minEmployees: 10, maxEmployees: 100 });
    const outOfRange = scoreLead(makeLead({ employee_count: 1000 }), { minEmployees: 10, maxEmployees: 100 });
    expect(inRange.breakdown.employeeFit).toBe(15);
    expect(outOfRange.breakdown.employeeFit).toBeLessThan(15);
  });

  it("awards data completeness points per present contact field", () => {
    const complete = scoreLead(makeLead(), {});
    const bare = scoreLead(
      makeLead({ website: "", phone: "", contact_email: "", linkedin_url: "" }),
      {}
    );
    expect(complete.breakdown.dataCompleteness).toBe(15);
    expect(bare.breakdown.dataCompleteness).toBe(0);
  });

  it("caps growth signal credit at 3 signals (15 points)", () => {
    const none = scoreLead(makeLead({ growth_signals: "" }), {});
    const one = scoreLead(makeLead({ growth_signals: "hiring" }), {});
    const many = scoreLead(makeLead({ growth_signals: "hiring;website redesign;press mention;expanded service area" }), {});
    expect(none.breakdown.growthSignals).toBe(0);
    expect(one.breakdown.growthSignals).toBe(5);
    expect(many.breakdown.growthSignals).toBe(15);
  });

  it("parses growth_signals into a clean list", () => {
    const scored = scoreLead(makeLead({ growth_signals: "hiring;website redesign" }), {});
    expect(scored.growthSignalList).toEqual(["hiring", "website redesign"]);
  });

  it("handles an empty growth_signals string without producing a stray empty entry", () => {
    const scored = scoreLead(makeLead({ growth_signals: "" }), {});
    expect(scored.growthSignalList).toEqual([]);
  });

  it("gives full maturity credit at 5+ years old, partial credit for younger companies", () => {
    const currentYear = new Date().getFullYear();
    const mature = scoreLead(makeLead({ founded_year: currentYear - 10 }), {});
    const brandNew = scoreLead(makeLead({ founded_year: currentYear }), {});
    expect(mature.breakdown.maturity).toBe(10);
    expect(brandNew.breakdown.maturity).toBe(0);
  });

  it("never exceeds a total score of 100", () => {
    const scored = scoreLead(makeLead({ growth_signals: "hiring;website redesign;press mention;expanded service area" }), {});
    expect(scored.score).toBeLessThanOrEqual(100);
  });

  it("classifies a fully-matching, fully-enriched lead as Hot (score 100)", () => {
    const scored = scoreLead(makeLead({ growth_signals: "hiring;website redesign;press mention" }), {
      industries: ["Manufacturing"],
    });
    expect(scored.score).toBe(100);
    expect(scored.tier).toBe("Hot");
  });

  it("classifies a lead with only an industry mismatch as Cool", () => {
    // Industry matches (25) + data completeness (15) + maturity (10) = 50 base,
    // no revenue/employee target set (full 20+15 credit) pushes it back up to
    // Hot — so explicitly mismatch industry to land in the middle tiers instead.
    const scored = scoreLead(
      makeLead({ growth_signals: "", founded_year: new Date().getFullYear() }),
      { industries: ["Healthcare Services"] }
    );
    // industryFit(5) + revenueFit(20) + employeeFit(15) + data(15) + growth(0) + maturity(0) = 55
    expect(scored.score).toBe(55);
    expect(scored.tier).toBe("Cool");
  });

  it("classifies a lead with no useful data and no fit as Cold", () => {
    const scored = scoreLead(
      makeLead({
        website: "",
        phone: "",
        contact_email: "",
        linkedin_url: "",
        growth_signals: "",
        founded_year: new Date().getFullYear(),
        estimated_revenue: 999_999_999,
        employee_count: 999_999,
      }),
      { industries: ["Healthcare Services"], minRevenue: 1_000_000, maxRevenue: 2_000_000, minEmployees: 5, maxEmployees: 20 }
    );
    expect(scored.tier).toBe("Cold");
    expect(scored.score).toBeLessThan(40);
  });
});

describe("rationale", () => {
  it("mentions industry, revenue, and growth signal fit for a strong match", () => {
    const scored = scoreLead(makeLead(), { industries: ["Manufacturing"], minRevenue: 1_000_000, maxRevenue: 10_000_000 });
    const text = rationale(scored);
    expect(text).toContain("Acme Widgets");
    expect(text).toContain(String(scored.score));
    expect(text).toMatch(/matches your target industry|revenue is in your target range/);
  });

  it("falls back to a generic explanation for a weak match", () => {
    const weak = scoreLead(
      makeLead({
        website: "",
        phone: "",
        contact_email: "",
        linkedin_url: "",
        growth_signals: "",
        founded_year: new Date().getFullYear(),
      }),
      {
        industries: ["Healthcare Services"],
        minRevenue: 1_000_000,
        maxRevenue: 2_000_000,
        minEmployees: 5,
        maxEmployees: 20,
      }
    );
    expect(rationale(weak)).toContain("only a partial fit");
  });
});
