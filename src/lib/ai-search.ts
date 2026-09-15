import { AI_TIMEOUT_MS, CLAUDE_MODEL, getAnthropicClient } from "./ai-client";
import type { IcpFilters } from "./types";

/**
 * Lets a rep type "hot manufacturing leads in Ohio or Texas over $5M revenue
 * that are hiring" into a single box instead of hand-configuring six filter
 * controls. With an API key, Claude parses the query into structured filters
 * via tool use (constrained to the real industry/state values in the
 * dataset, so it can't invent a filter value that doesn't exist). Without a
 * key, a regex/keyword heuristic below covers the common patterns — it's not
 * as flexible, but the feature never just stops working.
 */

export interface NlSearchResult {
  filters: Partial<IcpFilters>;
  explanation: string;
  source: "ai" | "heuristic";
}

export interface SearchMeta {
  industries: string[];
  states: string[];
}

// Money and employee-count mentions are disambiguated by shape, not by
// scanning for nearby keywords: a money figure always carries a `$` or an
// explicit magnitude word (million/k/...), while an employee count is a bare
// integer next to the word "employees" (nobody says "50 thousand
// employees" in this context). That means both parsers can scan the *whole*
// query independently — no windowing/scoping needed to keep "between 10 and
// 50 employees ... revenue over $1M" from cross-contaminating.
const MONEY = /(\$)?\s*(\d+(?:\.\d+)?)\s*(million|mil|m|thousand|k)?/i;

function toAmount(raw: string, unit: string | undefined): number {
  const n = parseFloat(raw);
  const u = (unit ?? "").toLowerCase();
  if (u.startsWith("m")) return n * 1_000_000;
  if (u === "k" || u === "thousand") return n * 1_000;
  return n;
}

function parseMoneyRange(text: string): { min?: number; max?: number } {
  const between = text.match(new RegExp(`between\\s+${MONEY.source}\\s+(?:and|-|to)\\s+${MONEY.source}`, "i"));
  if (between) {
    const hasIndicator = Boolean(between[1] || between[3] || between[4] || between[6]);
    if (hasIndicator) {
      // "between 5 and 20 million" states the unit once, at the end — if
      // only one side got an explicit unit, back-fill it onto the other
      // rather than reading "5" as a literal 5.
      const fallbackUnit = between[3] ?? between[6];
      return {
        min: toAmount(between[2], between[3] ?? fallbackUnit),
        max: toAmount(between[5], between[6] ?? fallbackUnit),
      };
    }
  }

  const over = text.match(new RegExp(`(?:over|above|at least|more than)\\s+${MONEY.source}`, "i"));
  if (over && (over[1] || over[3])) return { min: toAmount(over[2], over[3]) };

  const under = text.match(new RegExp(`(?:under|below|at most|less than)\\s+${MONEY.source}`, "i"));
  if (under && (under[1] || under[3])) return { max: toAmount(under[2], under[3]) };

  return {};
}

const HEADCOUNT_WORD = /employees?|headcount|staff|people/i;

function parseEmployeeRange(text: string): { min?: number; max?: number } {
  const between = text.match(
    new RegExp(`between\\s+(\\d+)\\s+(?:and|-|to)\\s+(\\d+)\\s+(?:${HEADCOUNT_WORD.source})`, "i")
  );
  if (between) return { min: Number(between[1]), max: Number(between[2]) };

  const over = text.match(new RegExp(`(?:over|above|at least|more than)\\s+(\\d+)\\s+(?:${HEADCOUNT_WORD.source})`, "i"));
  if (over) return { min: Number(over[1]) };

  const under = text.match(new RegExp(`(?:under|below|at most|less than)\\s+(\\d+)\\s+(?:${HEADCOUNT_WORD.source})`, "i"));
  if (under) return { max: Number(under[1]) };

  return {};
}

const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  "HVAC & Home Services": ["hvac", "plumbing", "electrical", "roofing", "home service"],
  "IT Services & MSP": ["it service", "msp", "managed it", "cybersecurity", "software"],
  Manufacturing: ["manufactur", "fabrication", "industrial"],
  "Healthcare Services": ["healthcare", "health care", "dental", "clinic", "medical"],
  "Logistics & Distribution": ["logistic", "freight", "warehous", "distribution", "trucking"],
  "Professional Services": ["accounting", "law firm", "legal", "staffing", "marketing agency", "professional service"],
  Construction: ["construction", "contractor", "landscap", "builder"],
  "Food & Beverage": ["food", "beverage", "bakery", "catering", "restaurant"],
  "Automotive Services": ["auto", "car wash", "fleet", "vehicle"],
  "Education & Training": ["education", "tutoring", "training", "childcare", "school"],
};

function parseIndustries(query: string, known: string[]): string[] {
  const q = query.toLowerCase();
  return known.filter((industry) => {
    const synonyms = INDUSTRY_SYNONYMS[industry] ?? [industry.toLowerCase()];
    return synonyms.some((s) => q.includes(s));
  });
}

const STATE_NAMES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado",
  CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho",
  IL: "illinois", IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky", LA: "louisiana",
  ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi",
  MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada", NH: "new hampshire", NJ: "new jersey",
  NM: "new mexico", NY: "new york", NC: "north carolina", ND: "north dakota", OH: "ohio",
  OK: "oklahoma", OR: "oregon", PA: "pennsylvania", RI: "rhode island", SC: "south carolina",
  SD: "south dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont", VA: "virginia",
  WA: "washington", WV: "west virginia", WI: "wisconsin", WY: "wyoming",
};

// A handful of state codes double as common English words (OR, IN, ME, HI, PA, OK, ...).
// A bare 2-letter-code match on those is unreliable ("Ohio OR Texas" reads "OR" as
// Oregon) — for those specific codes, require the full state name instead; the
// unambiguous codes (OH, TX, CA, FL, ...) can still match as bare tokens.
const AMBIGUOUS_CODES = new Set(["OR", "IN", "ME", "HI", "PA", "OK", "MA", "LA", "DE", "SO", "TO", "MI"]);

function parseStates(query: string, known: string[]): string[] {
  const q = query.toLowerCase();
  const upper = query.toUpperCase();
  const tokens: string[] = upper.match(/\b[A-Z]{2}\b/g) ?? [];

  return known.filter((state) => {
    if (STATE_NAMES[state] && q.includes(STATE_NAMES[state])) return true;
    if (AMBIGUOUS_CODES.has(state)) return false;
    return tokens.includes(state);
  });
}

function parseMinScore(query: string): number | undefined {
  const q = query.toLowerCase();
  if (/\b(best|top|hot|highest[- ]scoring|highest quality)\b/.test(q)) return 80;
  if (/\b(good|warm|solid)\b/.test(q)) return 60;
  return undefined;
}

export function heuristicParse(query: string, meta: SearchMeta): NlSearchResult {
  const industries = parseIndustries(query, meta.industries);
  const states = parseStates(query, meta.states);
  const revenue = parseMoneyRange(query);
  const employees = parseEmployeeRange(query);
  const minScore = parseMinScore(query);

  const filters: Partial<IcpFilters> = {
    ...(industries.length && { industries }),
    ...(states.length && { states }),
    ...(revenue.min != null && { minRevenue: revenue.min }),
    ...(revenue.max != null && { maxRevenue: revenue.max }),
    ...(employees.min != null && { minEmployees: employees.min }),
    ...(employees.max != null && { maxEmployees: employees.max }),
    ...(minScore != null && { minScore }),
  };

  const parts: string[] = [];
  if (industries.length) parts.push(industries.join(", "));
  if (states.length) parts.push(`in ${states.join("/")}`);
  if (revenue.min != null || revenue.max != null) {
    parts.push(`revenue ${revenue.min ? `$${(revenue.min / 1e6).toFixed(1)}M+` : ""}${revenue.min && revenue.max ? "–" : ""}${revenue.max ? `up to $${(revenue.max / 1e6).toFixed(1)}M` : ""}`);
  }
  if (minScore != null) parts.push(`score ${minScore}+`);

  const explanation = parts.length
    ? `Applied filters: ${parts.join(", ")}.`
    : `Couldn't confidently extract filters from that — showing all leads. Try mentioning an industry, state, or revenue range.`;

  return { filters, explanation, source: "heuristic" };
}

const SEARCH_TOOL = (meta: SearchMeta) => ({
  name: "set_lead_filters",
  description: "Translate a natural-language lead search request into structured filter parameters for the lead database.",
  input_schema: {
    type: "object" as const,
    properties: {
      industries: {
        type: "array",
        items: { type: "string", enum: meta.industries },
        description: "Industry names to filter to, chosen ONLY from the enum. Omit entirely if the query isn't industry-specific.",
      },
      states: {
        type: "array",
        items: { type: "string", enum: meta.states },
        description: "Two-letter state codes to filter to, chosen ONLY from the enum. Omit entirely if not location-specific.",
      },
      minRevenue: { type: "number", description: "Minimum estimated annual revenue in USD, if implied." },
      maxRevenue: { type: "number", description: "Maximum estimated annual revenue in USD, if implied." },
      minEmployees: { type: "number", description: "Minimum employee count, if implied." },
      maxEmployees: { type: "number", description: "Maximum employee count, if implied." },
      minScore: {
        type: "number",
        description: "Minimum ICP-fit score 0-100. Use 80 for 'best'/'top'/'hot', 60 for 'good'/'warm'. Omit if the query doesn't ask for a quality bar.",
      },
      q: { type: "string", description: "Free-text keyword for anything not covered above (e.g. a specific sub-industry or company trait)." },
      explanation: { type: "string", description: "One short, plain-English sentence summarizing the filters you applied." },
    },
    required: ["explanation"],
  },
});

export async function parseNaturalLanguageQuery(query: string, meta: SearchMeta): Promise<NlSearchResult> {
  const client = getAnthropicClient();
  if (!client) return heuristicParse(query, meta);

  try {
    const msg = await client.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: 400,
        tools: [SEARCH_TOOL(meta)],
        tool_choice: { type: "tool", name: "set_lead_filters" },
        messages: [{ role: "user", content: `Parse this lead search request: "${query}"` }],
      },
      { timeout: AI_TIMEOUT_MS }
    );

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("no tool_use block in response");

    const input = toolUse.input as Record<string, unknown>;
    const { explanation, ...rest } = input;
    const filters: Partial<IcpFilters> = rest as Partial<IcpFilters>;

    return {
      filters,
      explanation: typeof explanation === "string" ? explanation : "Filters applied.",
      source: "ai",
    };
  } catch (err) {
    console.error("parseNaturalLanguageQuery: falling back to heuristic parser", err);
    return heuristicParse(query, meta);
  }
}
