export function LeadsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200" style={{ animationDelay: `${i * 40}ms` }} />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" style={{ animationDelay: `${i * 40}ms` }} />
            </div>
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" style={{ animationDelay: `${i * 40}ms` }} />
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" style={{ animationDelay: `${i * 40}ms` }} />
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" style={{ animationDelay: `${i * 40}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
