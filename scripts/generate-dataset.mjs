// Generates a synthetic (non-scraped, no real PII) sample lead dataset that
// mimics the shape of data a scraper like SaaSquatch would collect. Used to
// seed the local demo database so the app is runnable without live scraping
// or paid third-party enrichment APIs.
import { writeFileSync } from "node:fs";

const INDUSTRIES = [
  { name: "HVAC & Home Services", sub: ["HVAC Installation", "Plumbing", "Electrical", "Roofing"] },
  { name: "IT Services & MSP", sub: ["Managed IT", "Cybersecurity", "Cloud Consulting", "Software Support"] },
  { name: "Manufacturing", sub: ["Metal Fabrication", "Industrial Equipment", "Packaging", "Precision Machining"] },
  { name: "Healthcare Services", sub: ["Dental Practice", "Physical Therapy", "Home Health Care", "Urgent Care"] },
  { name: "Logistics & Distribution", sub: ["Freight Brokerage", "Warehousing", "Last-Mile Delivery", "Wholesale Distribution"] },
  { name: "Professional Services", sub: ["Accounting Firm", "Law Firm", "Staffing Agency", "Marketing Agency"] },
  { name: "Construction", sub: ["General Contracting", "Commercial Construction", "Landscaping", "Specialty Trades"] },
  { name: "Food & Beverage", sub: ["Commercial Bakery", "Catering", "Food Distribution", "Craft Beverage"] },
  { name: "Automotive Services", sub: ["Auto Repair", "Fleet Maintenance", "Auto Parts Distribution", "Car Wash Chain"] },
  { name: "Education & Training", sub: ["Tutoring Services", "Corporate Training", "Childcare", "Vocational School"] },
];

const CITIES = [
  ["Austin", "TX"], ["Denver", "CO"], ["Columbus", "OH"], ["Charlotte", "NC"],
  ["Phoenix", "AZ"], ["Tampa", "FL"], ["Indianapolis", "IN"], ["Nashville", "TN"],
  ["Kansas City", "MO"], ["Raleigh", "NC"], ["Salt Lake City", "UT"], ["Milwaukee", "WI"],
  ["Sacramento", "CA"], ["Portland", "OR"], ["Cincinnati", "OH"], ["Pittsburgh", "PA"],
  ["Boise", "ID"], ["Richmond", "VA"], ["Omaha", "NE"], ["Tucson", "AZ"],
];

const NAME_PARTS_A = ["Summit", "Vanguard", "Apex", "Cascade", "Harbor", "Ironwood", "Northgate", "Redstone",
  "Bluepeak", "Sterling", "Meridian", "Granite", "Cedarbrook", "Highland", "Pioneer", "Crestline",
  "Lakeside", "Union", "Riverside", "Anchor", "Foundry", "Timber", "Coastal", "Westbrook"];
const NAME_PARTS_B = {
  "HVAC & Home Services": ["Mechanical", "Comfort Systems", "Home Services", "Air Solutions"],
  "IT Services & MSP": ["Technologies", "IT Group", "Networks", "Systems"],
  "Manufacturing": ["Manufacturing", "Industrial", "Works", "Fabrication"],
  "Healthcare Services": ["Health Partners", "Clinic Group", "Care Network", "Wellness"],
  "Logistics & Distribution": ["Logistics", "Freight", "Distribution", "Supply Co"],
  "Professional Services": ["Advisors", "Partners", "Consulting Group", "& Associates"],
  "Construction": ["Builders", "Construction Group", "Contracting", "Development"],
  "Food & Beverage": ["Foods", "Provisions", "Kitchen Co", "Beverage Co"],
  "Automotive Services": ["Auto Group", "Motorworks", "Service Center", "Fleet Co"],
  "Education & Training": ["Learning Group", "Academy", "Training Institute", "Education Partners"],
};

const SOURCES = ["Google Maps", "State Business Registry", "LinkedIn Company Search", "Industry Directory"];
const GROWTH_SIGNALS = ["hiring", "new location opened", "recent leadership change", "website redesign", "press mention", "expanded service area"];

function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function pickN(arr, n, rng) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
}

// Deterministic PRNG so the dataset is reproducible across environments.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260214);
const rows = [];
let id = 1;

for (let i = 0; i < 320; i++) {
  const industry = pick(INDUSTRIES, rng);
  const sub = pick(industry.sub, rng);
  const [city, state] = pick(CITIES, rng);
  const a = pick(NAME_PARTS_A, rng);
  const b = pick(NAME_PARTS_B[industry.name], rng);
  const companyName = `${a} ${b}`;
  const domain = `${a}${b}`.toLowerCase().replace(/[^a-z]/g, "") + ".com";
  const employeeCount = Math.round(5 + rng() * 245);
  const revenuePerEmployee = 90000 + rng() * 180000;
  const estimatedRevenue = Math.round((employeeCount * revenuePerEmployee) / 10000) * 10000;
  const foundedYear = Math.round(1975 + rng() * 48);
  const hasWebsite = rng() > 0.08;
  const hasPhone = rng() > 0.05;
  const hasLinkedIn = rng() > 0.15;
  const signals = pickN(GROWTH_SIGNALS, Math.round(rng() * 3), rng);
  const source = pick(SOURCES, rng);

  rows.push({
    id: id++,
    company_name: companyName,
    industry: industry.name,
    sub_industry: sub,
    city,
    state,
    website: hasWebsite ? `https://www.${domain}` : "",
    phone: hasPhone ? `(${100 + Math.floor(rng() * 899)}) ${100 + Math.floor(rng() * 899)}-${1000 + Math.floor(rng() * 8999)}` : "",
    contact_email: hasWebsite ? `info@${domain}` : "",
    employee_count: employeeCount,
    estimated_revenue: estimatedRevenue,
    founded_year: foundedYear,
    linkedin_url: hasLinkedIn ? `https://www.linkedin.com/company/${domain.replace(".com", "")}` : "",
    growth_signals: signals.join(";"),
    source,
    description: `${companyName} is a ${sub.toLowerCase()} business based in ${city}, ${state}, operating in the ${industry.name.toLowerCase()} space since ${foundedYear}.`,
  });
}

const headers = Object.keys(rows[0]);
const csv = [
  headers.join(","),
  ...rows.map((r) => headers.map((h) => {
    const v = String(r[h] ?? "");
    return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",")),
].join("\n");

writeFileSync(new URL("../data/leads.csv", import.meta.url), csv);
console.log(`Generated ${rows.length} synthetic leads -> data/leads.csv`);
