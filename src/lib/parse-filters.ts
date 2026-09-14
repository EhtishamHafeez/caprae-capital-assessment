import type { IcpFilters } from "./types";

export function parseFilters(params: URLSearchParams): IcpFilters {
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean);
  const num = (key: string) => {
    const v = params.get(key);
    return v ? Number(v) : undefined;
  };
  return {
    q: params.get("q") ?? undefined,
    industries: list("industries"),
    states: list("states"),
    minRevenue: num("minRevenue"),
    maxRevenue: num("maxRevenue"),
    minEmployees: num("minEmployees"),
    maxEmployees: num("maxEmployees"),
    minScore: num("minScore"),
    sortBy: (params.get("sortBy") as IcpFilters["sortBy"]) ?? undefined,
    sortDir: (params.get("sortDir") as IcpFilters["sortDir"]) ?? undefined,
    page: num("page"),
    pageSize: num("pageSize"),
  };
}
