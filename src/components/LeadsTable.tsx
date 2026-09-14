"use client";

import type { IcpFilters, ScoredLead } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  leads: ScoredLead[];
  savedIds: Set<number>;
  onToggleSave: (id: number) => void;
  onOpenDetail: (lead: ScoredLead) => void;
  sortBy: IcpFilters["sortBy"];
  sortDir: IcpFilters["sortDir"];
  onSort: (col: NonNullable<IcpFilters["sortBy"]>) => void;
  emptyMessage?: string;
}

function SortHeader({ label, col, sortBy, sortDir, onSort }: {
  label: string;
  col: NonNullable<IcpFilters["sortBy"]>;
  sortBy: IcpFilters["sortBy"];
  sortDir: IcpFilters["sortDir"];
  onSort: Props["onSort"];
}) {
  const active = sortBy === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
    >
      {label}
      {active && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

export function LeadsTable({
  leads,
  savedIds,
  onToggleSave,
  onOpenDetail,
  sortBy,
  sortDir,
  onSort,
  emptyMessage = "No leads match your current filters. Try widening your target profile.",
}: Props) {
  if (!leads.length) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 py-24 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3"><SortHeader label="Company" col="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Industry</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Location</th>
            <th className="px-4 py-3"><SortHeader label="Employees" col="employees" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="px-4 py-3"><SortHeader label="Revenue" col="revenue" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="px-4 py-3"><SortHeader label="Score" col="score" sortBy={sortBy} sortDir={sortDir} onSort={onSort} /></th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Signals</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpenDetail(lead)}>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{lead.company_name}</div>
                <div className="text-xs text-slate-500">{lead.sub_industry}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{lead.industry}</td>
              <td className="px-4 py-3 text-slate-600">{lead.city}, {lead.state}</td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{formatNumber(lead.employee_count)}</td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{formatCurrency(lead.estimated_revenue)}</td>
              <td className="px-4 py-3"><ScoreBadge score={lead.score} tier={lead.tier} /></td>
              <td className="px-4 py-3">
                {lead.growthSignalList.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {lead.growthSignalList.length} signal{lead.growthSignalList.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSave(lead.id); }}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    savedIds.has(lead.id) ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {savedIds.has(lead.id) ? "Saved" : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
