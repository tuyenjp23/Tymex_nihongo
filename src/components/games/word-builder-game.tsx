"use client";
import * as React from "react";
import { applyHint, checkArrangement, wbScore, type WbPuzzle, type WbResult } from "@/lib/games/word-builder";
import { Ja } from "@/components/ja";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SpeakButton } from "@/components/content/speak-button";
import { cn } from "@/lib/utils";

export interface WordBuilderOutcome {
  puzzles: WbPuzzle[];
  results: Record<string, WbResult>;
  startedAt: number;
}

type Status = "building" | "correct" | "revealed";

/**
 * Word Builder: cho nghĩa tiếng Việt → bấm các mảnh kana theo đúng thứ tự để tạo cách đọc.
 * Dùng được hoàn toàn bằng bàn phím (mọi mảnh là <button>); kết quả đúng/sai được thông báo qua vùng role="status".
 */
export function WordBuilderGame({ puzzles, onFinish }: { puzzles: WbPuzzle[]; onFinish: (o: WordBuilderOutcome) => void }) {
  const [index, setIndex] = React.useState(0);
  const [placed, setPlaced] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<Status>("building");
  const [cur, setCur] = React.useState<WbResult>({ wrong: 0, hints: 0, revealed: false });
  const [feedback, setFeedback] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const results = React.useRef<Record<string, WbResult>>({});
  const startedAt = React.useRef(Date.now());
  const reported = React.useRef(false);

  const p = puzzles[index];
  const byId = new Map(p.tiles.map((t) => [t.id, t]));
  const free = p.tiles.filter((t) => !placed.includes(t.id));
  const full = placed.length === p.answer.length;
  const last = index === puzzles.length - 1;

  function place(id: string) {
    if (status !== "building") return;
    setFeedback("");
    setPlaced((cur) => (cur.length >= p.answer.length ? cur : [...cur, id]));
  }
  function unplace(id: string) {
    if (status !== "building") return;
    setFeedback("");
    setPlaced((cur) => cur.filter((x) => x !== id));
  }
  function check() {
    if (checkArrangement(p, placed)) {
      setStatus("correct");
      setFeedback("Đúng rồi!");
    } else {
      setCur((c) => ({ ...c, wrong: c.wrong + 1 }));
      setFeedback("Chưa đúng. Thử đổi thứ tự các mảnh hoặc dùng gợi ý.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }
  function hint() {
    const next = applyHint(p, placed);
    if (!next) return;
    setCur((c) => ({ ...c, hints: c.hints + 1 }));
    setFeedback("Đã đặt giúp bạn một mảnh (điểm và mức ghi nhớ bị giảm).");
    setPlaced(next);
  }
  function reveal() {
    setCur((c) => ({ ...c, revealed: true }));
    const ids: string[] = [];
    for (const text of p.answer) ids.push(p.tiles.find((t) => t.text === text && !ids.includes(t.id))!.id);
    setPlaced(ids);
    setStatus("revealed");
    setFeedback("Đây là đáp án đúng.");
  }
  function next() {
    results.current[p.id] = cur;
    if (last) {
      if (reported.current) return;
      reported.current = true;
      onFinish({ puzzles, results: results.current, startedAt: startedAt.current });
      return;
    }
    setIndex((i) => i + 1);
    setPlaced([]);
    setStatus("building");
    setCur({ wrong: 0, hints: 0, revealed: false });
    setFeedback("");
  }

  const done = status !== "building";
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span>Từ {index + 1}/{puzzles.length}</span>
        <span>{p.level}{p.pos ? ` · ${p.pos}` : ""}</span>
      </div>
      <Progress value={index + (done ? 1 : 0)} max={puzzles.length} label="Tiến độ ván chơi" tone="accent" />
      <Card>
        <p className="text-sm text-muted-foreground">Ghép các mảnh kana thành cách đọc của từ có nghĩa:</p>
        <p className="mt-1 text-2xl font-semibold" data-testid="wb-meaning">{p.meaning}</p>

        <p className="mt-4 text-sm font-medium" id="wb-answer-label">Cách đọc của bạn</p>
        <ul
          aria-labelledby="wb-answer-label"
          className={cn("mt-1 flex min-h-16 flex-wrap items-center gap-2 rounded-md border border-dashed p-2", shake ? "nc-shake border-danger" : status === "correct" ? "border-success" : "border-border")}
        >
          {placed.length === 0 ? <li className="px-1 text-sm text-muted-foreground">Chọn các mảnh bên dưới…</li> : null}
          {placed.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => unplace(id)}
                disabled={done}
                aria-label={`${byId.get(id)!.text}, bấm để bỏ ra`}
                className="nc-touch min-w-12 rounded-md border border-primary bg-muted px-3 py-2 text-xl"
              >
                <Ja text={byId.get(id)!.text} />
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm font-medium" id="wb-bank-label">Các mảnh (có mảnh thừa gây nhiễu)</p>
        <ul aria-labelledby="wb-bank-label" className="mt-1 flex min-h-14 flex-wrap gap-2">
          {free.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => place(t.id)}
                disabled={done}
                aria-label={`Mảnh ${t.text}`}
                className="nc-touch min-w-12 rounded-md border border-border bg-card px-3 py-2 text-xl hover:bg-muted disabled:opacity-60"
              >
                <Ja text={t.text} />
              </button>
            </li>
          ))}
        </ul>

        <div role="status" aria-live="polite" className={cn("mt-3 min-h-6 text-sm", status === "correct" ? "font-semibold text-success" : status === "revealed" ? "text-muted-foreground" : "text-danger")}>
          {feedback}
        </div>

        {done ? (
          <div className="mt-2 rounded-md bg-muted p-3 text-sm">
            <div className="flex items-center gap-2">
              <Ja text={p.word} className="text-xl" />
              <span className="text-muted-foreground">（<Ja text={p.reading} />）</span>
              <SpeakButton text={p.reading} />
            </div>
            {p.example ? (
              <p className="mt-2"><Ja text={p.example.ja} /><br /><span className="text-muted-foreground">{p.example.vi}</span></p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">Điểm từ này: {wbScore(cur)}</p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {!done ? (
            <>
              <Button onClick={check} disabled={!full}>Kiểm tra</Button>
              <Button variant="outline" onClick={() => { setPlaced([]); setFeedback(""); }} disabled={placed.length === 0}>Xóa hết</Button>
              <Button variant="outline" onClick={hint}>Gợi ý</Button>
              <Button variant="ghost" onClick={reveal}>Xem đáp án</Button>
            </>
          ) : (
            <Button onClick={next}>{last ? "Xem kết quả" : "Từ tiếp"}</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
