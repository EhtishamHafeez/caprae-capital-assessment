export interface Lead {
  id: number;
  company_name: string;
  industry: string;
  sub_industry: string;
  city: string;
  state: string;
  website: string;
  phone: string;
  contact_email: string;
  employee_count: number;
  estimated_revenue: number;
  founded_year: number;
  linkedin_url: string;
  growth_signals: string; // semicolon-separated
  source: string;
  description: string;
}

export interface ScoreBreakdown {
  industryFit: number;
  revenueFit: number;
  employeeFit: number;
  dataCompleteness: number;
  growthSignals: number;
  maturity: number;
}

export interface ScoredLead extends Lead {
  score: number;
  tier: "Hot" | "Warm" | "Cool" | "Cold";
  breakdown: ScoreBreakdown;
  growthSignalList: string[];
}

export interface IcpFilters {
  q?: string;
  industries?: string[];
  states?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
  minScore?: number;
  sortBy?: "score" | "revenue" | "employees" | "name";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}
