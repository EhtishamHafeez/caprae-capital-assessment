"use client";

export function AiExplanationBanner({
  explanation,
  source,
  onClear,
}: {
  explanation: string;
  source: "ai" | "heuristic";
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
      <div className="flex items-center gap-2">
        <span aria-hidden>✨</span>
        <span>{explanation}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            source === "ai" ? "bg-violet-600 text-white" : "bg-violet-200 text-violet-800"
          }`}
          title={source === "ai" ? "Parsed by Claude" : "Parsed by keyword/regex fallback (no ANTHROPIC_API_KEY set)"}
        >
          {source === "ai" ? "Claude" : "heuristic"}
        </span>
      </div>
      <button onClick={onClear} className="shrink-0 text-xs font-medium text-violet-700 hover:text-violet-900">
        Dismiss
      </button>
    </div>
  );
}
