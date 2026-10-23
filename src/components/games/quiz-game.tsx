"use client";
import * as React from "react";
import { gameReducer, initGame, type GameState } from "@/lib/games/engine";
import type { GameQuestion } from "@/lib/games/types";
import { formatDuration } from "@/lib/utils";
import { Ja } from "@/components/ja";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Figure } from "@/components/content/figure";
import { CheckCircle2, XCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Màn chơi trắc nghiệm dùng chung cho Picture to Kanji, Kanji to Meaning, Reading Challenge, Daily Review, Speed Challenge.
 * Trạng thái nằm trong reducer thuần (src/lib/games/engine.ts) — đã kiểm thử: không cộng điểm hai lần, không bỏ qua câu.
 */
export function QuizGame({
  questions,
  timeLimitSec,
  onFinish,
  autoAdvance = false,
}: {
  questions: GameQuestion[];
  /** Có giá trị → chế độ tính giờ (Speed Challenge); hết giờ ván tự kết thúc */
  timeLimitSec: number | null;
  onFinish: (s: GameState, startedAt: number) => void;
  autoAdvance?: boolean;
}) {
  const [state, dispatch] = React.useReducer(gameReducer, questions, initGame);
  const startedAt = React.useRef(Date.now());
  const shownAt = React.useRef(Date.now());
  const endAt = React.useRef(timeLimitSec ? Date.now() + timeLimitSec * 1000 : null);
  const [now, setNow] = React.useState(() => Date.now());
  const reported = React.useRef(false);

  const q = state.questions[state.index];
  const answer = q ? state.answers[q.id] : undefined;

  React.useEffect(() => {
    if (!endAt.current || state.status === "finished") return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (endAt.current && n >= endAt.current) dispatch({ type: "finish" });
    }, 250);
    return () => clearInterval(t);
  }, [state.status]);

  React.useEffect(() => {
    if (state.status === "finished" && !reported.current) {
      reported.current = true;
      onFinish(state, startedAt.current);
    }
  }, [state, onFinish]);

  React.useEffect(() => {
    shownAt.current = Date.now();
  }, [state.index]);

  // Tự sang câu kế sau khi trả lời (chế độ tính giờ)
  React.useEffect(() => {
    if (!autoAdvance || !answer) return;
    const t = setTimeout(() => dispatch({ type: "next" }), answer.correct ? 450 : 1100);
    return () => clearTimeout(t);
  }, [autoAdvance, answer]);

  const choose = React.useCallback(
    (optionId: string) => dispatch({ type: "answer", optionId, ms: Date.now() - shownAt.current }),
    [],
  );

  React.useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) {
        e.preventDefault();
        choose(q.options[n - 1].id);
      } else if ((e.key === "Enter" || e.key === " ") && answer && !autoAdvance) {
        if ((e.target as HTMLElement | null)?.tagName === "BUTTON") return;
        e.preventDefault();
        dispatch({ type: "next" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, answer, autoAdvance, choose]);

  if (!q) return null;
  const remaining = endAt.current ? Math.max(0, Math.ceil((endAt.current - now) / 1000)) : null;
  const isLast = state.index + 1 >= state.questions.length;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Câu {state.index + 1}/{state.questions.length}</span>
        <span className="flex items-center gap-3">
          {state.combo >= 2 ? <span className="nc-pop rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground" aria-label={`Combo ${state.combo}`}>Combo ×{state.combo}</span> : null}
          <span className="tabular-nums">{state.score} điểm</span>
          {remaining !== null ? <span role="timer" className={cn("font-mono tabular-nums", remaining <= 10 && "font-bold text-danger")}>{formatDuration(remaining)}</span> : null}
        </span>
      </div>
      <Progress value={state.index + (answer ? 1 : 0)} max={state.questions.length} label="Tiến độ ván chơi" tone="accent" />

      <Card className="text-center">
        <p className="mb-3 text-sm font-medium text-muted-foreground">{q.ask}</p>
        {q.prompt.kind === "image" ? (
          <Figure src={q.prompt.src} alt={q.prompt.alt} className="mx-auto h-44 w-44 sm:h-52 sm:w-52" />
        ) : (
          <div>
            <Ja text={q.prompt.text} className={q.prompt.text.length <= 2 ? "jp-kanji" : "jp-xl"} />
            {q.prompt.sub ? <p className="mt-1 text-sm text-muted-foreground">{q.prompt.sub}</p> : null}
            {q.prompt.context ? (
              <p className="mx-auto mt-3 max-w-md rounded-md bg-muted p-2 text-left text-sm">
                <Ja text={q.prompt.context.ja} className="text-base" /> <span className="text-muted-foreground">— {q.prompt.context.vi}</span>
              </p>
            ) : null}
          </div>
        )}
        <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Các lựa chọn">
          {q.options.map((o, i) => {
            const picked = answer?.optionId === o.id;
            const right = o.id === q.correctId;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={!!answer}
                  onClick={() => choose(o.id)}
                  className={cn(
                    "nc-touch flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                    !answer && "border-border hover:bg-muted",
                    answer && right && "border-success bg-[color-mix(in_oklab,var(--success)_14%,var(--card))]",
                    answer && picked && !right && "nc-shake border-danger bg-[color-mix(in_oklab,var(--danger)_14%,var(--card))]",
                    answer && !right && !picked && "border-border opacity-55",
                  )}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-xs font-semibold">{i + 1}</span>
                  {o.ja ? <Ja text={o.text} className="flex-1 text-xl" /> : <span className="flex-1 text-base">{o.text}</span>}
                  {answer && right ? <span className="flex items-center gap-1 text-sm font-medium text-success"><CheckCircle2 size={18} aria-hidden="true" /><span>Đáp án đúng</span></span> : null}
                  {answer && picked && !right ? <span className="flex items-center gap-1 text-sm font-medium text-danger"><XCircle size={18} aria-hidden="true" /><span>Bạn chọn</span></span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {answer ? (
          <div role="status" className="nc-pop mt-4 text-sm">
            <p className={cn("font-semibold", answer.correct ? "text-success" : "text-danger")}>{answer.correct ? `Đúng! +${answer.points} điểm` : "Chưa đúng."}</p>
            <p className="mt-0.5 text-muted-foreground">{q.explanation}</p>
          </div>
        ) : null}
      </Card>

      {!autoAdvance ? (
        <div className="flex justify-end">
          <Button disabled={!answer} onClick={() => dispatch({ type: "next" })}>{isLast ? "Xem kết quả" : "Câu tiếp"}</Button>
        </div>
      ) : (
        <div className="flex justify-end"><Button variant="ghost" onClick={() => dispatch({ type: "finish" })}>Kết thúc sớm</Button></div>
      )}
      <p className="text-center text-xs text-muted-foreground">Phím tắt: 1–{q.options.length} chọn đáp án{autoAdvance ? "" : " · Space/Enter câu tiếp"}</p>
    </div>
  );
}
