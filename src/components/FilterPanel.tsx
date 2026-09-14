"use client";

import type { IcpFilters } from "@/lib/types";

interface Props {
  meta: { industries: string[]; states: string[] };
  filters: IcpFilters;
  onChange: (next: Partial<IcpFilters>) => void;
  onReset: () => void;
}

function toggleInList(list: string[] | undefined, value: string): string[] {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

export function FilterPanel({ meta, filters, onChange, onReset }: Props) {
  return (
    <aside className="w-full shrink-0 space-y-6 rounded-xl border border-slate-200 bg-white p-4 lg:w-72">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Target profile (ICP)</h2>
        <button onClick={onReset} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          Reset
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Industry</h3>
        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {meta.industries.map((ind) => (
            <label key={ind} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                checked={filters.industries?.includes(ind) ?? false}
                onChange={() => onChange({ industries: toggleInList(filters.industries, ind), page: 1 })}
              />
              {ind}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">State</h3>
        <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
          {meta.states.map((st) => (
            <label key={st} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                checked={filters.states?.includes(st) ?? false}
                onChange={() => onChange({ states: toggleInList(filters.states, st), page: 1 })}
              />
              {st}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Target revenue (USD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            value={filters.minRevenue ?? ""}
            onChange={(e) => onChange({ minRevenue: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            placeholder="Max"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            value={filters.maxRevenue ?? ""}
            onChange={(e) => onChange({ maxRevenue: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Target employees</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            value={filters.minEmployees ?? ""}
            onChange={(e) => onChange({ minEmployees: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            placeholder="Max"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            value={filters.maxEmployees ?? ""}
            onChange={(e) => onChange({ maxEmployees: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
          />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Min. score</h3>
          <span className="text-xs font-semibold text-slate-700">{filters.minScore ?? 0}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.minScore ?? 0}
          onChange={(e) => onChange({ minScore: Number(e.target.value) || undefined, page: 1 })}
          className="w-full accent-slate-800"
        />
      </section>
    </aside>
  );
}
