"use client";

import { useState } from "react";
import type { ScoredLead } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  lead: ScoredLead;
  saved: boolean;
  onToggleSave: (id: number) => void;
  onClose: () => void;
}

const BREAKDOWN_LABELS: Record<keyof ScoredLead["breakdown"], { label: string; max: number }> = {
  industryFit: { label: "Industry fit", max: 25 },
  revenueFit: { label: "Revenue fit", max: 20 },
  employeeFit: { label: "Headcount fit", max: 15 },
  dataCompleteness: { label: "Data completeness", max: 15 },
  growthSignals: { label: "Growth signals", max: 15 },
  maturity: { label: "Company maturity", max: 10 },
};

export function LeadDrawer({ lead, saved, onToggleSave, onClose }: Props) {
  const [senderName, setSenderName] = useState("Alex");
  const [senderCompany, setSenderCompany] = useState("Caprae Capital");
  const [email, setEmail] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "template" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setEmail(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderName, senderCompany }),
      });
      const data = await res.json();
      setEmail(data.email);
      setSource(data.source);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{lead.company_name}</h2>
            <p className="text-sm text-slate-500">{lead.sub_industry} · {lead.city}, {lead.state}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <ScoreBadge score={lead.score} tier={lead.tier} />
          <button
            onClick={() => onToggleSave(lead.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${saved ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {saved ? "Saved to pipeline" : "Save to pipeline"}
          </button>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-slate-600">{lead.description}</p>

        <dl className="mb-5 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-slate-400">Employees</dt><dd className="font-medium text-slate-800">{formatNumber(lead.employee_count)}</dd></div>
          <div><dt className="text-xs text-slate-400">Est. revenue</dt><dd className="font-medium text-slate-800">{formatCurrency(lead.estimated_revenue)}</dd></div>
          <div><dt className="text-xs text-slate-400">Founded</dt><dd className="font-medium text-slate-800">{lead.founded_year}</dd></div>
          <div><dt className="text-xs text-slate-400">Source</dt><dd className="font-medium text-slate-800">{lead.source}</dd></div>
          <div><dt className="text-xs text-slate-400">Website</dt><dd className="truncate font-medium text-sky-700">{lead.website ? <a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a> : "—"}</dd></div>
          <div><dt className="text-xs text-slate-400">Phone</dt><dd className="font-medium text-slate-800">{lead.phone || "—"}</dd></div>
          <div><dt className="text-xs text-slate-400">Email</dt><dd className="font-medium text-slate-800">{lead.contact_email || "—"}</dd></div>
          <div><dt className="text-xs text-slate-400">LinkedIn</dt><dd className="truncate font-medium text-sky-700">{lead.linkedin_url ? <a href={lead.linkedin_url} target="_blank" rel="noreferrer">View profile</a> : "—"}</dd></div>
        </dl>

        {lead.growthSignalList.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Growth signals</h3>
            <div className="flex flex-wrap gap-1.5">
              {lead.growthSignalList.map((s) => (
                <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Score breakdown</h3>
          <div className="space-y-1.5">
            {(Object.keys(BREAKDOWN_LABELS) as (keyof ScoredLead["breakdown"])[]).map((key) => {
              const { label, max } = BREAKDOWN_LABELS[key];
              const value = lead.breakdown[key];
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 text-slate-500">{label}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-slate-800" style={{ width: `${(value / max) * 100}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right tabular-nums text-slate-600">{value}/{max}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">AI outreach draft</h3>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
            <input
              value={senderCompany}
              onChange={(e) => setSenderCompany(e.target.value)}
              placeholder="Your company"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Drafting…" : "Generate personalized email"}
          </button>

          {email && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {source === "ai" ? "Generated by Claude" : "Template fallback (no ANTHROPIC_API_KEY set)"}
                </span>
                <button onClick={copy} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                value={email}
                rows={10}
                className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
