"use client";
import * as React from "react";
import type { Conversation } from "@/lib/schemas";
import { Ja } from "@/components/ja";
import { SpeakButton } from "@/components/content/speak-button";
import { Button } from "@/components/ui/button";

/** Luyện phản xạ: thấy tình huống bằng tiếng Việt → tự nói/viết câu tiếng Nhật → bấm xem câu mẫu để đối chiếu. */
export function Drills({ drills }: { drills: Conversation["drills"] }) {
  const [shown, setShown] = React.useState<Record<number, boolean>>({});
  const [hint, setHint] = React.useState<Record<number, boolean>>({});
  return (
    <ol className="space-y-4">
      {drills.map((d, i) => (
        <li key={i} className="rounded-md border border-border p-3">
          <p className="font-medium">{i + 1}. {d.prompt_vi}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {d.hint_vi ? (
              <Button size="sm" variant="ghost" onClick={() => setHint((s) => ({ ...s, [i]: !s[i] }))} aria-expanded={!!hint[i]}>
                {hint[i] ? "Ẩn gợi ý" : "Gợi ý"}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => setShown((s) => ({ ...s, [i]: !s[i] }))} aria-expanded={!!shown[i]}>
              {shown[i] ? "Ẩn câu mẫu" : "Xem câu mẫu"}
            </Button>
          </div>
          {hint[i] ? <p className="mt-2 text-sm text-muted-foreground">{d.hint_vi}</p> : null}
          {shown[i] ? (
            <div className="nc-pop mt-2 flex items-start gap-3 rounded-md bg-muted p-3">
              <SpeakButton text={d.model_ja} label="Nghe câu mẫu" />
              <Ja text={d.model_ja} romaji className="text-lg" as="p" />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
