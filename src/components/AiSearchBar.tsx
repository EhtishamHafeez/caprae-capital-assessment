"use client";

import { useState } from "react";
import type { IcpFilters } from "@/lib/types";

interface Props {
  onApply: (filters: Partial<IcpFilters>, explanation: string, source: "ai" | "heuristic") => void;
  onError: (message: string) => void;
}

// A fixed example rather than one picked at random: randomizing it would
// need a client-only value, and diverging from the server-rendered HTML on
// first paint trips a React hydration mismatch.
const PLACEHOLDER = `Try: "hot manufacturing leads in Ohio or Texas over $5M revenue"`;

export function AiSearchBar({ onApply, onError }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/leads/nl-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        onError(data?.error?.message ?? "Too many AI requests — please wait a moment.");
        return;
      }
      if (!res.ok) {
        onError("Couldn't parse that search — try rephrasing it.");
        return;
      }
      const data = await res.json();
      onApply(data.filters, data.explanation, data.source);
    } catch {
      onError("Network error while reaching the AI search — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-violet-50 via-white to-white p-1.5 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        <span className="pl-2 text-violet-500" aria-hidden>
          ✨
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={PLACEHOLDER}
          disabled={loading}
          className="flex-1 bg-transparent px-1 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={loading || !query.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Thinking…
            </>
          ) : (
            "Ask AI"
          )}
        </button>
      </div>
    </div>
  );
}
