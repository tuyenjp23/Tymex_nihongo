"use client";
import * as React from "react";
import { Ja } from "@/components/ja";
import { SpeakButton } from "@/components/content/speak-button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Hội thoại đầy đủ; có công tắc ẩn/hiện bản dịch để tự kiểm tra hiểu bài. */
export function Dialogue({ lines, characters }: { lines: { speaker: string; ja: string; vi: string }[]; characters: { name: string }[] }) {
  const [showVi, setShowVi] = React.useState(true);
  const order = characters.map((c) => c.name);
  const id = React.useId();
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Switch id={id} checked={showVi} onChange={setShowVi} label="Hiện bản dịch tiếng Việt" />
        <label htmlFor={id}>Hiện bản dịch tiếng Việt</label>
      </div>
      <ul className="space-y-3">
        {lines.map((l, i) => {
          const right = order.indexOf(l.speaker) % 2 === 1;
          return (
            <li key={i} className={cn("flex gap-2", right && "flex-row-reverse")}>
              <div className={cn("max-w-[92%] rounded-xl border border-border px-3 py-2 sm:max-w-[80%]", right ? "bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))]" : "bg-card")}>
                <p className="text-xs font-medium text-muted-foreground">{l.speaker}</p>
                <div className="flex items-start gap-2">
                  <Ja text={l.ja} romaji className="text-lg" as="p" />
                </div>
                {showVi ? <p className="mt-0.5 text-sm text-muted-foreground">{l.vi}</p> : null}
              </div>
              <SpeakButton text={l.ja} label="Nghe câu này" className="mt-2" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
