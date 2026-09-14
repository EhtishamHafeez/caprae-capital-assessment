import type { ScoredLead } from "@/lib/types";

const TIER_STYLES: Record<ScoredLead["tier"], string> = {
  Hot: "bg-orange-100 text-orange-700 ring-orange-600/20",
  Warm: "bg-amber-100 text-amber-700 ring-amber-600/20",
  Cool: "bg-sky-100 text-sky-700 ring-sky-600/20",
  Cold: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function ScoreBadge({ score, tier }: { score: number; tier: ScoredLead["tier"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TIER_STYLES[tier]}`}
      title={`ICP fit score: ${score}/100`}
    >
      <span className="font-semibold tabular-nums">{score}</span>
      <span>{tier}</span>
    </span>
  );
}
