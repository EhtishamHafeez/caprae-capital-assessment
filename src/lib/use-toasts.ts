import { useCallback, useRef, useState } from "react";

export interface Toast {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
}

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback((message: string, variant: Toast["variant"] = "info", durationMs = 3500) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, variant }]);
    timers.current.set(
      id,
      setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, durationMs)
    );
  }, []);

  return { toasts, push, dismiss };
}
