import { describe, expect, it } from "vitest";
import { dedupeByDomain } from "./db";

function makeRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    id: "1",
    company_name: "Acme Widgets",
    industry: "Manufacturing",
    sub_industry: "Metal Fabrication",
    city: "Columbus",
    state: "OH",
    website: "https://www.acmewidgets.com",
    phone: "",
    contact_email: "",
    employee_count: "50",
    estimated_revenue: "5000000",
    founded_year: "2010",
    linkedin_url: "",
    growth_signals: "",
    source: "Google Maps",
    description: "A metal fabrication company.",
    ...overrides,
  };
}

describe("dedupeByDomain", () => {
  it("collapses two rows with the same domain to one", () => {
    const rows = [
      makeRow({ id: "1", website: "https://www.acmewidgets.com" }),
      makeRow({ id: "2", website: "https://www.acmewidgets.com" }),
    ];
    const result = dedupeByDomain(rows);
    expect(result).toHaveLength(1);
  });

  it("treats the domain match as case-insensitive and trims whitespace", () => {
    const rows = [
      makeRow({ id: "1", website: "https://www.AcmeWidgets.com" }),
      makeRow({ id: "2", website: "  https://www.acmewidgets.com  " }),
    ];
    const result = dedupeByDomain(rows);
    expect(result).toHaveLength(1);
  });

  it("keeps the row with the higher data-completeness score on conflict", () => {
    const sparse = makeRow({ id: "1", phone: "", contact_email: "", linkedin_url: "" });
    const complete = makeRow({
      id: "2",
      phone: "(555) 123-4567",
      contact_email: "info@acmewidgets.com",
      linkedin_url: "https://www.linkedin.com/company/acmewidgets",
    });
    const result = dedupeByDomain([sparse, complete]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("keeps the higher-completeness row regardless of input order", () => {
    const sparse = makeRow({ id: "1", phone: "", contact_email: "", linkedin_url: "" });
    const complete = makeRow({
      id: "2",
      phone: "(555) 123-4567",
      contact_email: "info@acmewidgets.com",
      linkedin_url: "https://www.linkedin.com/company/acmewidgets",
    });
    const result = dedupeByDomain([complete, sparse]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("keeps the first-encountered row when completeness is tied", () => {
    const rows = [
      makeRow({ id: "1", website: "https://www.acmewidgets.com" }),
      makeRow({ id: "2", website: "https://www.acmewidgets.com" }),
    ];
    const result = dedupeByDomain(rows);
    expect(result[0].id).toBe("1");
  });

  it("does not dedup rows that have no website against each other", () => {
    const rows = [
      makeRow({ id: "1", company_name: "Acme Widgets", website: "" }),
      makeRow({ id: "2", company_name: "Different Company", website: "" }),
    ];
    const result = dedupeByDomain(rows);
    expect(result).toHaveLength(2);
  });

  it("leaves rows with distinct domains untouched", () => {
    const rows = [
      makeRow({ id: "1", website: "https://www.acmewidgets.com" }),
      makeRow({ id: "2", website: "https://www.otherco.com" }),
    ];
    const result = dedupeByDomain(rows);
    expect(result).toHaveLength(2);
  });

  it("preserves the original relative order of surviving rows", () => {
    const rows = [
      makeRow({ id: "1", website: "https://www.first.com" }),
      makeRow({ id: "2", website: "https://www.second.com" }),
      makeRow({ id: "3", website: "https://www.first.com" }), // dup of row 1, tied completeness -> dropped (first-seen wins)
    ];
    const result = dedupeByDomain(rows);
    expect(result.map((r) => r.id)).toEqual(["1", "2"]);
  });
});
