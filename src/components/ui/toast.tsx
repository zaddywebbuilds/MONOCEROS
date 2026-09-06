"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (input: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const TONE_CLASS: Record<ToastTone, string> = {
  success: "border-accent-700/50 text-accent-300",
  error: "border-status-rejected/40 text-status-rejected",
  info: "border-ink-600 text-fg",
  warning: "border-status-pending/40 text-status-pending",
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: Omit<Toast, "id">) => {
      const id = (nextId += 1);
      setToasts((current) => [...current, { ...input, id }]);
      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={cn(
                "pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl border bg-ink-880/95 p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur",
                TONE_CLASS[t.tone],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">{t.title}</p>
                {t.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">{t.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded p-0.5 text-fg-subtle transition-colors hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }
  return context;
}

/**
 * Raises a toast when a server action result changes. Rendered inside forms
 * that use `useActionState`.
 */
export function ToastOnResult({
  result,
}: {
  result: { status?: "idle" | "success" | "error"; message?: string | null } | null;
}) {
  const { toast } = useToast();
  const seen = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!result?.message || result.status === "idle") return;
    const signature = `${result.status}:${result.message}`;
    if (seen.current === signature) return;
    seen.current = signature;
    toast({
      title: result.status === "success" ? "Done" : "Action failed",
      description: result.message,
      tone: result.status === "success" ? "success" : "error",
    });
  }, [result, toast]);

  return null;
}
