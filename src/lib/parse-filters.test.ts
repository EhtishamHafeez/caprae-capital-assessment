import { describe, expect, it } from "vitest";
import { parseFilters } from "./parse-filters";

describe("parseFilters", () => {
  it("returns an all-undefined filter object for empty search params", () => {
    const filters = parseFilters(new URLSearchParams());
    expect(filters.q).toBeUndefined();
    expect(filters.industries).toBeUndefined();
    expect(filters.minRevenue).toBeUndefined();
    expect(filters.sortBy).toBeUndefined();
    expect(filters.page).toBeUndefined();
  });

  it("splits comma-separated list params into arrays", () => {
    const filters = parseFilters(new URLSearchParams("industries=Manufacturing,Construction&states=OH,TX"));
    expect(filters.industries).toEqual(["Manufacturing", "Construction"]);
    expect(filters.states).toEqual(["OH", "TX"]);
  });

  it("drops empty entries produced by a trailing comma", () => {
    const filters = parseFilters(new URLSearchParams("industries=Manufacturing,"));
    expect(filters.industries).toEqual(["Manufacturing"]);
  });

  it("parses numeric params as numbers, not strings", () => {
    const filters = parseFilters(new URLSearchParams("minRevenue=1000000&maxEmployees=50&page=2&pageSize=10"));
    expect(filters.minRevenue).toBe(1_000_000);
    expect(filters.maxEmployees).toBe(50);
    expect(filters.page).toBe(2);
    expect(filters.pageSize).toBe(10);
  });

  it("passes through sort params verbatim", () => {
    const filters = parseFilters(new URLSearchParams("sortBy=revenue&sortDir=asc"));
    expect(filters.sortBy).toBe("revenue");
    expect(filters.sortDir).toBe("asc");
  });

  it("preserves the free-text search query", () => {
    const filters = parseFilters(new URLSearchParams("q=metal+fabrication"));
    expect(filters.q).toBe("metal fabrication");
  });
});
