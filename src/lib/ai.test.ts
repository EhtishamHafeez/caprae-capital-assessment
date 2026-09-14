import { beforeEach, describe, expect, it } from "vitest";
import { generateOutreachEmail } from "./ai";
import { scoreLead } from "./scoring";
import type { Lead } from "./types";

function makeScoredLead(overrides: Partial<Lead> = {}) {
  const lead: Lead = {
    id: Math.floor(Math.random() * 1_000_000), // unique id per test to dodge the outreach cache
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
    founded_year: 2010,
    linkedin_url: "https://www.linkedin.com/company/acmewidgets",
    growth_signals: "",
    source: "Google Maps",
    description: "A metal fabrication company.",
    ...overrides,
  };
  return scoreLead(lead, {});
}

describe("generateOutreachEmail (no ANTHROPIC_API_KEY configured)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("falls back to the deterministic template and reports source 'template'", async () => {
    const { email, source } = await generateOutreachEmail(makeScoredLead(), "Alex", "Caprae Capital");
    expect(source).toBe("template");
    expect(email).toContain("Subject: Quick question for Acme Widgets");
    expect(email).toContain("Alex");
  });

  it("references the company's industry when there are no growth signals", async () => {
    const { email } = await generateOutreachEmail(makeScoredLead({ growth_signals: "" }), "Alex", "Caprae Capital");
    expect(email).toContain("manufacturing companies in Columbus, OH");
  });

  it("references a growth signal naturally when one is present", async () => {
    const { email } = await generateOutreachEmail(makeScoredLead({ growth_signals: "press mention" }), "Alex", "Caprae Capital");
    expect(email).toContain("picking up some press");
    expect(email).not.toContain("has been press mention"); // regression: used to read ungrammatically
  });

  it("includes the sender's name and company in the signature and body", async () => {
    const { email } = await generateOutreachEmail(makeScoredLead(), "Jordan", "Northgate Partners");
    expect(email).toContain("Jordan");
    expect(email).toContain("Northgate Partners");
  });
});
