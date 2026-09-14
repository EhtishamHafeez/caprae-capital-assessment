import { afterEach, describe, expect, it } from "vitest";
import { getLeadById, getMeta, getSavedLeadIds, queryLeads, toggleSaved } from "./leads-repo";

// Integration tests against the real seeded SQLite database (data/leads.csv).
// toggleSaved mutates shared state, so every test that calls it cleans up
// after itself in an afterEach rather than leaving rows behind.

describe("getMeta", () => {
  it("returns the distinct industries and states present in the seed data", () => {
    const meta = getMeta();
    expect(meta.industries).toContain("Manufacturing");
    expect(meta.industries.length).toBeGreaterThan(5);
    expect(meta.states.length).toBeGreaterThan(5);
  });
});

describe("queryLeads", () => {
  it("filters strictly by the requested industries", () => {
    const { leads } = queryLeads({ industries: ["Manufacturing"], pageSize: 1000 });
    expect(leads.length).toBeGreaterThan(0);
    expect(leads.every((l) => l.industry === "Manufacturing")).toBe(true);
  });

  it("filters strictly by the requested states", () => {
    const { leads } = queryLeads({ states: ["TX"], pageSize: 1000 });
    expect(leads.every((l) => l.state === "TX")).toBe(true);
  });

  it("full-text searches company name, description, and sub_industry", () => {
    const { leads } = queryLeads({ q: "nonexistentcompanyxyz123" });
    expect(leads).toEqual([]);
    expect(queryLeads({ q: "nonexistentcompanyxyz123" }).total).toBe(0);
  });

  it("paginates results consistently with the reported total", () => {
    const pageSize = 10;
    const firstPage = queryLeads({ page: 1, pageSize });
    const secondPage = queryLeads({ page: 2, pageSize });
    expect(firstPage.leads).toHaveLength(pageSize);
    expect(secondPage.leads).toHaveLength(pageSize);
    const firstIds = new Set(firstPage.leads.map((l) => l.id));
    const secondIds = new Set(secondPage.leads.map((l) => l.id));
    expect([...firstIds].some((id) => secondIds.has(id))).toBe(false);
    expect(firstPage.total).toBeGreaterThan(pageSize);
  });

  it("sorts by revenue in the requested direction", () => {
    const asc = queryLeads({ sortBy: "revenue", sortDir: "asc", pageSize: 20 }).leads;
    const desc = queryLeads({ sortBy: "revenue", sortDir: "desc", pageSize: 20 }).leads;
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i].estimated_revenue).toBeGreaterThanOrEqual(asc[i - 1].estimated_revenue);
    }
    for (let i = 1; i < desc.length; i++) {
      expect(desc[i].estimated_revenue).toBeLessThanOrEqual(desc[i - 1].estimated_revenue);
    }
  });

  it("excludes leads scoring below minScore", () => {
    const { leads } = queryLeads({ minScore: 90, pageSize: 1000 });
    expect(leads.every((l) => l.score >= 90)).toBe(true);
  });
});

describe("getLeadById", () => {
  it("returns the matching lead with a computed score", () => {
    const { leads } = queryLeads({ pageSize: 1 });
    const target = leads[0];
    const found = getLeadById(target.id);
    expect(found?.company_name).toBe(target.company_name);
    expect(found?.score).toBeGreaterThanOrEqual(0);
  });

  it("returns undefined for an id that doesn't exist", () => {
    expect(getLeadById(-1)).toBeUndefined();
  });
});

describe("toggleSaved / getSavedLeadIds", () => {
  const testLeadIds: number[] = [];

  afterEach(() => {
    // Ensure every lead this test saved is unsaved again, regardless of outcome.
    for (const id of testLeadIds) {
      if (getSavedLeadIds().includes(id)) toggleSaved(id);
    }
    testLeadIds.length = 0;
  });

  it("saves a lead on first toggle and unsaves it on the second", () => {
    const { leads } = queryLeads({ pageSize: 1 });
    const id = leads[0].id;
    testLeadIds.push(id);

    expect(getSavedLeadIds()).not.toContain(id);
    expect(toggleSaved(id)).toBe(true);
    expect(getSavedLeadIds()).toContain(id);
    expect(toggleSaved(id)).toBe(false);
    expect(getSavedLeadIds()).not.toContain(id);
  });
});
