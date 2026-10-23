"use client";
import * as React from "react";
import type { Conversation } from "@/lib/schemas";
import { Ja } from "@/components/ja";
import { SpeakButton } from "@/components/content/speak-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { recordActivity, useStudyTimer } from "@/lib/progress/actions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Fit = "best" | "ok" | "poor";
const FIT_LABEL: Record<Fit, { text: string; tone: "success" | "warning" | "danger" }> = {
  best: { text: "Rất phù hợp", tone: "success" },
  ok: { text: "Dùng được", tone: "warning" },
  poor: { text: "Chưa phù hợp", tone: "danger" },
};

/**
 * Nhập vai theo nhánh ĐỊNH SẴN (không phải AI tự do): người học chọn câu đáp, nhận phản hồi về mức độ phù hợp.
 */
export function Roleplay({ turns }: { turns: Conversation["roleplay"] }) {
  const [turnId, setTurnId] = React.useState<string | null>(turns[0]?.id ?? null);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [results, setResults] = React.useState<Fit[]>([]);
  const [done, setDone] = React.useState(false);
  const elapsed = useStudyTimer(15);
  const { toast } = useToast();
  const finishedRef = React.useRef(false);

  const turn = turns.find((t) => t.id === turnId) ?? null;

  function choose(i: number) {
    if (!turn || picked !== null) return; // chống bấm đúp
    setPicked(i);
    setResults((r) => [...r, turn.options[i].fit]);
  }

  function next() {
    if (!turn || picked === null) return;
    const target = turn.options[picked].next;
    setPicked(null);
    if (target) setTurnId(target);
    else finish();
  }

  function finish() {
    setDone(true);
    if (finishedRef.current) return;
    finishedRef.current = true;
    const best = results.filter((r) => r === "best").length;
    const ok = results.filter((r) => r === "ok").length;
    const badges = recordActivity({ minutes: elapsed(), xp: best * 8 + ok * 4 + 5 });
    for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
  }

  function restart() {
    setTurnId(turns[0]?.id ?? null);
    setPicked(null);
    setResults([]);
    setDone(false);
    finishedRef.current = false;
  }

  if (turns.length === 0) return null;

  if (done || !turn) {
    const best = results.filter((r) => r === "best").length;
    return (
      <Card>
        <CardTitle>Kết thúc tình huống</CardTitle>
        <p className="mt-2 text-sm">
          Bạn chọn <strong>{best}/{results.length}</strong> câu đáp “rất phù hợp”. Đây là phản hồi theo các nhánh soạn sẵn, giúp bạn làm quen với cách nói — không phải điểm đánh giá năng lực.
        </p>
        <Button className="mt-3" onClick={restart}>Chơi lại</Button>
      </Card>
    );
  }

  const chosen = picked !== null ? turn.options[picked] : null;
  return (
    <Card>
      <CardTitle>Nhập vai</CardTitle>
      <CardDescription className="mt-0.5">Chọn câu đáp phù hợp nhất. Lượt {results.length + (picked === null ? 1 : 0)}.</CardDescription>
      <div className="mt-3 flex items-start gap-3 rounded-md bg-muted p-3">
        <SpeakButton text={turn.npc_ja} label="Nghe lời đối phương" />
        <div>
          <Ja text={turn.npc_ja} romaji className="text-lg" as="p" />
          <p className="text-sm text-muted-foreground">{turn.npc_vi}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2" aria-label="Các câu đáp">
        {turn.options.map((o, i) => {
          const isPicked = picked === i;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => choose(i)}
                aria-pressed={isPicked}
                className={cn(
                  "nc-touch w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                  picked === null ? "border-border hover:bg-muted" : isPicked ? "border-primary bg-muted" : "border-border opacity-60",
                )}
              >
                <Ja text={o.ja} className="text-base" as="p" />
                {picked !== null && isPicked ? <p className="text-sm text-muted-foreground">{o.vi}</p> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {chosen ? (
        <div role="status" className="nc-pop mt-3 rounded-md border border-border p-3">
          <Badge tone={FIT_LABEL[chosen.fit].tone}>{FIT_LABEL[chosen.fit].text}</Badge>
          <p className="mt-1.5 text-sm">{chosen.feedback_vi}</p>
          <Button className="mt-3" size="sm" onClick={next}>{chosen.next ? "Tiếp tục" : "Hoàn thành"}</Button>
        </div>
      ) : null}
    </Card>
  );
}
