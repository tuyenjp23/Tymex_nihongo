"use client";
import * as React from "react";
import { KANA_GROUPS, KANA_NOTES, buildKanaQuiz, kanaFor, kanaPool, type KanaDirection, type KanaGroupId, type KanaScript } from "@/lib/kana-table";
import { memoryStage, MEMORY_STAGE_LABELS, qualityFromChoice, type MemoryStage } from "@/lib/srs";
import { mulberry32, randomSeed } from "@/lib/rng";
import { reviewKana } from "@/lib/progress/model";
import { recordActivity } from "@/lib/progress/actions";
import { useProgress } from "@/lib/progress/store";
import { todayString } from "@/lib/dates";
import type { GameQuestion } from "@/lib/games/types";
import type { GameState } from "@/lib/games/engine";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Skeleton, Alert } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { QuizGame } from "@/components/games/quiz-game";
import { SpeakButton, speakJapanese } from "@/components/content/speak-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const STAGE_STYLE: Record<MemoryStage, string> = {
  new: "bg-card",
  learning: "bg-[color-mix(in_oklab,var(--warning)_18%,var(--card))]",
  review: "bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))]",
  mastered: "bg-[color-mix(in_oklab,var(--success)_20%,var(--card))]",
};

export function KanaView() {
  const progress = useProgress();
  if (!progress) {
    return (
      <div role="status" aria-label="Đang tải" className="space-y-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  return (
    <Tabs
      tabs={[
        { id: "chart", label: "Bảng chữ cái", content: <Chart /> },
        { id: "practice", label: "Luyện tập", content: <Practice /> },
      ]}
    />
  );
}

/* ───────────── Bảng chữ ───────────── */

function Chart() {
  const progress = useProgress()!;
  const [script, setScript] = React.useState<KanaScript>("hiragana");
  const [group, setGroup] = React.useState<KanaGroupId>("basic");
  const [showRomaji, setShowRomaji] = React.useState(true);
  const [picked, setPicked] = React.useState<string | null>(null);
  const g = KANA_GROUPS.find((x) => x.id === group)!;
  const pickedChar = picked ? kanaFor(picked, script, group) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Chọn bảng chữ" className="inline-flex overflow-hidden rounded-md border border-border">
          {(["hiragana", "katakana"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={script === s} onClick={() => setScript(s)} className={cn("nc-touch px-4 py-2 text-sm font-medium", script === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {s === "hiragana" ? "ひらがな Hiragana" : "カタカナ Katakana"}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Chọn nhóm âm" className="inline-flex overflow-hidden rounded-md border border-border">
          {KANA_GROUPS.map((x) => (
            <button key={x.id} type="button" aria-pressed={group === x.id} onClick={() => { setGroup(x.id); setPicked(null); }} className={cn("nc-touch px-3 py-2 text-sm font-medium", group === x.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {x.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showRomaji} onChange={setShowRomaji} label="Hiện romaji trong bảng" /> Hiện romaji
        </label>
      </div>
      <p className="text-sm text-muted-foreground">{g.description} Bấm vào một chữ để nghe và xem ghi chú. Màu nền thể hiện mức nhớ của bạn.</p>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[22rem] border-collapse text-center">
          <caption className="sr-only">{g.label} — {script === "hiragana" ? "Hiragana" : "Katakana"}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-12 p-2 text-xs font-medium text-muted-foreground"><span className="sr-only">Hàng</span></th>
              {g.cols.map((c) => <th key={c} scope="col" className="p-2 text-xs font-medium text-muted-foreground">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {g.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-border">
                <th scope="row" className="p-2 text-xs font-medium text-muted-foreground">{row.label}</th>
                {row.cells.map((cell, ci) => {
                  if (!cell) return <td key={ci} className="p-1" aria-hidden="true" />;
                  const k = kanaFor(cell, script, group);
                  const stage = memoryStage(progress.kana[k.char]);
                  return (
                    <td key={ci} className="p-1">
                      <button
                        type="button"
                        onClick={() => { setPicked(cell); speakJapanese(k.char, 0.7); }}
                        aria-label={`${k.char}, ${k.romaji}, ${MEMORY_STAGE_LABELS[stage]}`}
                        aria-pressed={picked === cell}
                        className={cn("nc-touch w-full rounded-md border border-border py-2 hover:border-primary", STAGE_STYLE[stage], picked === cell && "ring-2 ring-primary")}
                      >
                        <span className="jp block text-2xl leading-tight sm:text-3xl" lang="ja">{k.char}</span>
                        {showRomaji ? <span className="block text-xs text-muted-foreground">{k.romaji}</span> : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Chú thích màu">
        {(Object.keys(STAGE_STYLE) as MemoryStage[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5"><span className={cn("inline-block h-3.5 w-3.5 rounded border border-border", STAGE_STYLE[s])} /> {MEMORY_STAGE_LABELS[s]}</li>
        ))}
      </ul>

      {pickedChar ? (
        <Card aria-live="polite" className="flex items-center gap-4">
          <span className="jp text-5xl" lang="ja">{pickedChar.char}</span>
          <div className="min-w-0 flex-1">
            <CardTitle as="h3">{pickedChar.romaji}</CardTitle>
            <CardDescription>
              {script === "hiragana" ? "Hiragana" : "Katakana"} · {MEMORY_STAGE_LABELS[memoryStage(progress.kana[pickedChar.char])]}
              {KANA_NOTES[pickedChar.hiragana] ? ` · ${KANA_NOTES[pickedChar.hiragana]}` : ""}
            </CardDescription>
          </div>
          <SpeakButton text={pickedChar.char} label={`Nghe ${pickedChar.romaji}`} rate={0.7} />
        </Card>
      ) : null}
      <p className="text-xs text-muted-foreground">Lưu ý: giọng đọc là giọng tổng hợp của trình duyệt (tùy thiết bị). Ứng dụng chưa có dữ liệu thứ tự nét viết nên không hiển thị thứ tự nét.</p>
    </div>
  );
}

/* ───────────── Luyện tập ───────────── */

interface Round {
  questions: GameQuestion[];
}

function toGameQuestions(qs: ReturnType<typeof buildKanaQuiz>): GameQuestion[] {
  return qs.map((q) => {
    const kanaPrompt = q.direction === "kana-to-romaji";
    return {
      id: q.id,
      mode: "kana",
      itemKey: q.target.char,
      level: "N5",
      topic: "kana",
      ask: kanaPrompt ? "Chữ này đọc là gì?" : "Chọn chữ kana đúng",
      prompt: { kind: "text", text: q.prompt, ja: kanaPrompt },
      options: q.options.map((o) => ({ id: o.id, text: o.text, ja: !kanaPrompt })),
      correctId: q.correctId,
      explanation: `${q.target.char} = ${q.target.romaji}`,
      tier: 1,
    } satisfies GameQuestion;
  });
}

function Practice() {
  const progress = useProgress()!;
  const { toast } = useToast();
  const [scripts, setScripts] = React.useState<"hiragana" | "katakana" | "both">("hiragana");
  const [groups, setGroups] = React.useState<KanaGroupId[]>(["basic"]);
  const [direction, setDirection] = React.useState<KanaDirection | "mixed">("mixed");
  const [count, setCount] = React.useState(10);
  const [round, setRound] = React.useState<Round | null>(null);
  const [runId, setRunId] = React.useState(0);
  const [result, setResult] = React.useState<{ correct: number; total: number; wrong: { char: string; romaji: string }[]; minutes: number } | null>(null);

  const scriptList: KanaScript[] = scripts === "both" ? ["hiragana", "katakana"] : [scripts];
  const pool = kanaPool(groups, scriptList);

  function toggleGroup(id: KanaGroupId) {
    setGroups((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function start() {
    const rng = mulberry32(randomSeed());
    const qs = buildKanaQuiz(pool, { count, direction, rng, progress: progress.kana, today: todayString() });
    if (qs.length < 3) {
      toast("Chưa đủ chữ để tạo bài. Hãy chọn thêm nhóm âm hoặc bảng chữ.", "error");
      return;
    }
    setResult(null);
    setRound({ questions: toGameQuestions(qs) });
    setRunId((n) => n + 1);
  }

  const finish = React.useCallback(
    (s: GameState, startedAt: number) => {
      const today = todayString();
      const answered = s.questions.filter((q) => s.answers[q.id]);
      const minutes = Math.max(0.1, Math.round(((Date.now() - startedAt) / 60000) * 10) / 10);
      const badges = recordActivity({ minutes, xp: s.correct * 2, reviews: answered.length }, (p) => {
        let next = p;
        for (const q of answered) {
          const a = s.answers[q.id];
          next = reviewKana(next, q.itemKey, qualityFromChoice(a.correct, a.ms), today);
        }
        return next;
      });
      for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
      setResult({
        correct: s.correct,
        total: answered.length,
        minutes,
        wrong: answered.filter((q) => !s.answers[q.id].correct).map((q) => ({ char: q.itemKey, romaji: q.explanation.split(" = ")[1] ?? "" })),
      });
      setRound(null);
    },
    [toast],
  );

  if (round) return <QuizGame key={runId} questions={round.questions} timeLimitSec={null} onFinish={finish} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {result ? (
        <Card aria-live="polite" className="space-y-3 text-center">
          <CardTitle>Kết quả: {result.correct}/{result.total} đúng</CardTitle>
          <CardDescription>Mức nhớ từng chữ đã được cập nhật (lịch ôn SM-2). Chữ sai sẽ được ưu tiên xuất hiện lại.</CardDescription>
          {result.wrong.length ? (
            <ul className="flex flex-wrap justify-center gap-2" aria-label="Các chữ cần ôn thêm">
              {result.wrong.map((w) => (
                <li key={w.char} className="rounded-md border border-border px-3 py-1.5"><span className="jp text-xl" lang="ja">{w.char}</span> <span className="text-sm text-muted-foreground">{w.romaji}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-success">Không sai chữ nào — tốt lắm!</p>}
        </Card>
      ) : null}
      <Card className="space-y-4">
        <CardTitle>Thiết lập bài luyện</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium">Bảng chữ
            <Select value={scripts} onChange={(e) => setScripts(e.target.value as typeof scripts)}>
              <option value="hiragana">Hiragana</option>
              <option value="katakana">Katakana</option>
              <option value="both">Cả hai</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium">Dạng câu hỏi
            <Select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
              <option value="mixed">Trộn cả hai</option>
              <option value="kana-to-romaji">Thấy kana → chọn romaji</option>
              <option value="romaji-to-kana">Thấy romaji → chọn kana</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium">Số câu
            <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </label>
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Nhóm âm</legend>
          <div className="flex flex-wrap gap-3">
            {KANA_GROUPS.map((x) => (
              <label key={x.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={groups.includes(x.id)} onChange={() => toggleGroup(x.id)} className="h-4 w-4" /> {x.label}
              </label>
            ))}
          </div>
        </fieldset>
        {pool.length < 4 ? <Alert tone="warning">Hãy chọn ít nhất một nhóm âm.</Alert> : <p className="text-sm text-muted-foreground">Bộ luyện có {pool.length} chữ. Chữ đến hạn ôn và chữ bạn hay sai được ưu tiên.</p>}
        <Button onClick={start} disabled={pool.length < 4}>{result ? "Luyện lại" : "Bắt đầu"}</Button>
      </Card>
    </div>
  );
}
