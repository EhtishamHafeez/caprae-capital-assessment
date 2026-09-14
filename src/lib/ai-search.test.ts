import { describe, expect, it } from "vitest";
import { heuristicParse } from "./ai-search";

const meta = {
  industries: ["Manufacturing", "HVAC & Home Services", "Healthcare Services", "Automotive Services"],
  states: ["OH", "TX", "FL", "CA"],
};

describe("heuristicParse", () => {
  it("matches an industry via its synonym list", () => {
    const { filters } = heuristicParse("show me hvac companies", meta);
    expect(filters.industries).toEqual(["HVAC & Home Services"]);
  });

  it("matches multiple industries when several are mentioned", () => {
    const { filters } = heuristicParse("manufacturing and healthcare leads", meta);
    expect(filters.industries).toEqual(expect.arrayContaining(["Manufacturing", "Healthcare Services"]));
  });

  it("extracts two-letter state codes that are in the known list", () => {
    const { filters } = heuristicParse("companies in TX or OH", meta);
    expect(filters.states).toEqual(expect.arrayContaining(["TX", "OH"]));
  });

  it("doesn't mistake the connector word 'or' for the state code OR, or 'in' for IN", () => {
    // Regression: "manufacturing leads in OH or TX" was matching OH+TX (intended)
    // AND OR+IN (the connector words "or"/"in", upper-cased, collide with real
    // state codes Oregon/Indiana).
    const metaWithAmbiguousCodes = { ...meta, states: ["OH", "TX", "OR", "IN"] };
    const { filters } = heuristicParse("manufacturing leads in OH or TX", metaWithAmbiguousCodes);
    expect(filters.states).toEqual(expect.arrayContaining(["OH", "TX"]));
    expect(filters.states).not.toContain("OR");
    expect(filters.states).not.toContain("IN");
  });

  it("still matches an ambiguous-code state when its full name is used", () => {
    const metaWithAmbiguousCodes = { ...meta, states: ["OR", "IN", "PA"] };
    const { filters } = heuristicParse("companies in Oregon, Indiana, or Pennsylvania", metaWithAmbiguousCodes);
    expect(filters.states).toEqual(expect.arrayContaining(["OR", "IN", "PA"]));
  });

  it("ignores incidental two-letter words that aren't state codes in the known list", () => {
    // "to" upper-cases to "TO", a valid 2-letter token shape, but isn't a state in `meta.states`.
    const { filters } = heuristicParse("we want to expand our pipeline", meta);
    expect(filters.states ?? []).toHaveLength(0);
  });

  it("parses a revenue range expressed as 'between X and Y million'", () => {
    const { filters } = heuristicParse("revenue between 5 and 20 million", meta);
    expect(filters.minRevenue).toBe(5_000_000);
    expect(filters.maxRevenue).toBe(20_000_000);
  });

  it("parses an open-ended revenue floor ('over $10M')", () => {
    const { filters } = heuristicParse("revenue over $10M", meta);
    expect(filters.minRevenue).toBe(10_000_000);
    expect(filters.maxRevenue).toBeUndefined();
  });

  it("parses an open-ended revenue ceiling ('under 500k revenue')", () => {
    const { filters } = heuristicParse("under 500k revenue", meta);
    expect(filters.maxRevenue).toBe(500_000);
  });

  it("parses an employee count range independently of revenue", () => {
    const { filters } = heuristicParse("between 10 and 50 employees with revenue over 1 million", meta);
    expect(filters.minEmployees).toBe(10);
    expect(filters.maxEmployees).toBe(50);
    expect(filters.minRevenue).toBe(1_000_000);
  });

  it("maps 'best'/'top'/'hot' to a minScore of 80", () => {
    expect(heuristicParse("show me the best leads", meta).filters.minScore).toBe(80);
    expect(heuristicParse("top manufacturing leads", meta).filters.minScore).toBe(80);
  });

  it("maps 'good'/'warm' to a minScore of 60", () => {
    expect(heuristicParse("good leads in Ohio", meta).filters.minScore).toBe(60);
  });

  it("returns no filters and a helpful explanation for an unparseable query", () => {
    const { filters, explanation } = heuristicParse("asdkjfhaskjdfh", meta);
    expect(Object.keys(filters)).toHaveLength(0);
    expect(explanation).toMatch(/couldn't confidently/i);
  });

  it("always tags the result source as 'heuristic'", () => {
    expect(heuristicParse("manufacturing", meta).source).toBe("heuristic");
  });
});
