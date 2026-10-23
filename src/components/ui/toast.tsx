"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Info, X } from "@/components/icons";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastCtx = React.createContext<{ toast: (message: string, tone?: ToastTone) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = React.useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++counter.current;
      setItems((l) => [...l.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "nc-pop pointer-events-auto flex max-w-sm items-start gap-2 rounded-md border bg-card px-3 py-2.5 text-sm shadow-lg",
              t.tone === "success" && "border-success",
              t.tone === "error" && "border-danger",
              t.tone === "info" && "border-border",
            )}
          >
            {t.tone === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> : null}
            {t.tone === "error" ? <XCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" /> : null}
            {t.tone === "info" ? <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> : null}
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Đóng thông báo" className="-mr-1 rounded p-1 hover:bg-muted">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast phải nằm trong <ToastProvider>");
  return ctx;
}
