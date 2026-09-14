"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FilterPanel } from "@/components/FilterPanel";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadsTableSkeleton } from "@/components/LeadsTableSkeleton";
import { LeadDrawer } from "@/components/LeadDrawer";
import { AiSearchBar } from "@/components/AiSearchBar";
import { AiExplanationBanner } from "@/components/AiExplanationBanner";
import { ToastStack } from "@/components/ToastStack";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useToasts } from "@/lib/use-toasts";
import { serializeFilters } from "@/lib/parse-filters";
import type { IcpFilters, ScoredLead } from "@/lib/types";

const DEFAULT_FILTERS: IcpFilters = { page: 1, pageSize: 25, sortBy: "score", sortDir: "desc" };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const [filters, setFilters] = useState<IcpFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedLead, setSelectedLead] = useState<ScoredLead | null>(null);
  const [view, setView] = useState<"all" | "saved">("all");
  const [aiResult, setAiResult] = useState<{ explanation: string; source: "ai" | "heuristic" } | null>(null);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const activeFilters = useMemo(() => ({ ...filters, q: debouncedSearch || undefined }), [filters, debouncedSearch]);

  const { data: meta } = useSWR<{ industries: string[]; states: string[] }>("/api/meta", fetcher);
  const { data: allData, isLoading: loadingAll } = useSWR<{ leads: ScoredLead[]; total: number }>(
    view === "all" ? `/api/leads?${serializeFilters(activeFilters)}` : null,
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

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
    setAiResult(null);
  }

  function handleAiApply(aiFilters: Partial<IcpFilters>, explanation: string, source: "ai" | "heuristic") {
    const { q, ...rest } = aiFilters;
    setFilters((f) => ({ ...DEFAULT_FILTERS, ...rest, sortBy: f.sortBy, sortDir: f.sortDir, page: 1 }));
    if (q) setSearchInput(q);
    setAiResult({ explanation, source });
  }

  async function toggleSave(id: number) {
    const wasSaved = savedIds.has(id);
    await fetch(`/api/leads/${id}/save`, { method: "POST" });
    mutateSaved();
    pushToast(wasSaved ? "Removed from pipeline" : "Saved to pipeline", "success");
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
              <span aria-hidden className="text-sm">◆</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-slate-900">LeadPilot</h1>
              <p className="text-xs text-slate-500">AI-assisted ICP scoring & outreach</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
              <button
                onClick={() => setView("all")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition ${view === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                All leads
              </button>
              <button
                onClick={() => setView("saved")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition ${view === "saved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Saved ({savedIds.size})
              </button>
            </div>
            <a
              href={view === "saved" ? "/api/leads/export?saved=1" : `/api/leads/export?${serializeFilters(activeFilters)}`}
              onClick={() => pushToast("Preparing CSV export…", "info", 2000)}
              className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Export CSV
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6">
        {view === "all" && (
          <div className="flex flex-col gap-2">
            <AiSearchBar onApply={handleAiApply} onError={(msg) => pushToast(msg, "error")} />
            {aiResult && (
              <AiExplanationBanner
                explanation={aiResult.explanation}
                source={aiResult.source}
                onClear={() => setAiResult(null)}
              />
            )}
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          {view === "all" && (
            <FilterPanel
              meta={meta ?? { industries: [], states: [] }}
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
            />
          )}

          <div className="flex flex-1 flex-col gap-4">
            {view === "all" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); updateFilters({ page: 1 }); }}
                  placeholder="Search company name, sub-industry, or description…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none sm:max-w-md"
                />
                <span className="text-sm text-slate-500">{total} lead{total !== 1 ? "s" : ""} matched</span>
              </div>
            )}

            {loading ? (
              <LeadsTableSkeleton />
            ) : (
              <LeadsTable
                leads={leads}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                onOpenDetail={setSelectedLead}
                sortBy={filters.sortBy}
                sortDir={filters.sortDir}
                onSort={handleSort}
                emptyMessage={
                  view === "saved"
                    ? "You haven't saved any leads yet — click \"Save\" on a lead to add it to your pipeline."
                    : undefined
                }
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
        </div>
      </main>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          saved={savedIds.has(selectedLead.id)}
          onToggleSave={toggleSave}
          onClose={() => setSelectedLead(null)}
          icpFilters={activeFilters}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
