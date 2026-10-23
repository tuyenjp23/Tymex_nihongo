"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

/** Tabs có thể điều hướng bằng phím mũi tên (WAI-ARIA tabs pattern). */
export function Tabs({ tabs, initial, className }: { tabs: TabDef[]; initial?: string; className?: string }) {
  const [active, setActive] = React.useState(initial ?? tabs[0]?.id);
  const base = React.useId();
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  function onKey(e: React.KeyboardEvent, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const t = tabs[next];
    setActive(t.id);
    refs.current[t.id]?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border" aria-orientation="horizontal">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            id={`${base}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "nc-touch -mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              active === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`${base}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={active !== t.id}
          className="pt-4"
        >
          {active === t.id ? t.content : null}
        </div>
      ))}
    </div>
  );
}
