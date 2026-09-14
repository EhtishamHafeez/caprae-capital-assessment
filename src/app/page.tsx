"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FilterPanel } from "@/components/FilterPanel";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadDrawer } from "@/components/LeadDrawer";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { IcpFilters, ScoredLead } from "@/lib/types";

const DEFAULT_FILTERS: IcpFilters = { page: 1, pageSize: 25, sortBy: "score", sortDir: "desc" };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toQuery(filters: IcpFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v == null || v === "") return;
    params.set(k, Array.isArray(v) ? v.join(",") : String(v));
  });
  return params.toString();
}

export default function Home() {
  const [filters, setFilters] = useState<IcpFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedLead, setSelectedLead] = useState<ScoredLead | null>(null);
  const [view, setView] = useState<"all" | "saved">("all");

  const activeFilters = useMemo(() => ({ ...filters, q: debouncedSearch || undefined }), [filters, debouncedSearch]);

  const { data: meta } = useSWR<{ industries: string[]; states: string[] }>("/api/meta", fetcher);
  const { data: allData, isLoading: loadingAll } = useSWR<{ leads: ScoredLead[]; total: number }>(
    view === "all" ? `/api/leads?${toQuery(activeFilters)}` : null,
    fetcher
  );
  const { data: savedData, mutate: mutateSaved, isLoading: loadingSaved } = useSWR<{ leads: ScoredLead[] }>(
    "/api/leads/saved",
    fetcher
  );

  const savedIds = useMemo(() => new Set((savedData?.leads ?? []).map((l) => l.id)), [savedData]);
  const leads = view === "all" ? (allData?.leads ?? []) : (savedData?.leads ?? []);
  const total = view === "all" ? (allData?.total ?? 0) : (savedData?.leads.length ?? 0);
  const loading = view === "all" ? loadingAll : loadingSaved;

  function updateFilters(next: Partial<IcpFilters>) {
    setFilters((f) => ({ ...f, ...next }));
  }

  async function toggleSave(id: number) {
    await fetch(`/api/leads/${id}/save`, { method: "POST" });
    mutateSaved();
  }

  function handleSort(col: NonNullable<IcpFilters["sortBy"]>) {
    setFilters((f) => ({
      ...f,
      sortBy: col,
      sortDir: f.sortBy === col && f.sortDir === "desc" ? "asc" : "desc",
    }));
  }

  const pageCount = Math.max(1, Math.ceil(total / (filters.pageSize ?? 25)));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">LeadPilot</h1>
            <p className="text-xs text-slate-500">AI-assisted ICP scoring & outreach, built on a SaaSquatch-style lead dataset</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
              <button
                onClick={() => setView("all")}
                className={`rounded-md px-3 py-1.5 font-medium ${view === "all" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
              >
                All leads
              </button>
              <button
                onClick={() => setView("saved")}
                className={`rounded-md px-3 py-1.5 font-medium ${view === "saved" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
              >
                Saved ({savedIds.size})
              </button>
            </div>
            <a
              href={view === "saved" ? "/api/leads/export?saved=1" : `/api/leads/export?${toQuery(activeFilters)}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row">
        {view === "all" && (
          <FilterPanel
            meta={meta ?? { industries: [], states: [] }}
            filters={filters}
            onChange={updateFilters}
            onReset={() => { setFilters(DEFAULT_FILTERS); setSearchInput(""); }}
          />
        )}

        <div className="flex flex-1 flex-col gap-4">
          {view === "all" && (
            <div className="flex items-center justify-between">
              <input
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); updateFilters({ page: 1 }); }}
                placeholder="Search company name, sub-industry, or description…"
                className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <span className="text-sm text-slate-500">{total} lead{total !== 1 ? "s" : ""} matched</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-24 text-sm text-slate-400">Loading leads…</div>
          ) : (
            <LeadsTable
              leads={leads}
              savedIds={savedIds}
              onToggleSave={toggleSave}
              onOpenDetail={setSelectedLead}
              sortBy={filters.sortBy}
              sortDir={filters.sortDir}
              onSort={handleSort}
            />
          )}

          {view === "all" && pageCount > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => updateFilters({ page: (filters.page ?? 1) - 1 })}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-slate-500">Page {filters.page ?? 1} of {pageCount}</span>
              <button
                disabled={(filters.page ?? 1) >= pageCount}
                onClick={() => updateFilters({ page: (filters.page ?? 1) + 1 })}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          saved={savedIds.has(selectedLead.id)}
          onToggleSave={toggleSave}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
