import { describe, expect, it } from "vitest";
import { formatCurrency, formatNumber } from "./format";

describe("formatCurrency", () => {
  it("formats millions with one decimal and an M suffix", () => {
    expect(formatCurrency(5_400_000)).toBe("$5.4M");
    expect(formatCurrency(1_000_000)).toBe("$1.0M");
  });

  it("formats thousands rounded to the nearest K", () => {
    expect(formatCurrency(45_000)).toBe("$45K");
    expect(formatCurrency(999_000)).toBe("$999K");
  });

  it("formats sub-thousand values as plain dollars", () => {
    expect(formatCurrency(500)).toBe("$500");
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatNumber", () => {
  it("adds thousands separators", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1_000_000)).toBe("1,000,000");
  });

  it("leaves small numbers unformatted", () => {
    expect(formatNumber(42)).toBe("42");
  });
});
