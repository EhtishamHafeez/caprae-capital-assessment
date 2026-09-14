"use client";

import type { Toast } from "@/lib/use-toasts";

const VARIANT_STYLES: Record<Toast["variant"], string> = {
  success: "bg-slate-900 text-white",
  error: "bg-red-600 text-white",
  info: "bg-slate-700 text-white",
};

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg px-4 py-2.5 text-sm shadow-lg ${VARIANT_STYLES[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-1 text-white/70 hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
