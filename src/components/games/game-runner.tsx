"use client";
import * as React from "react";
import Link from "next/link";
import type { GameItem, GameQuestion } from "@/lib/games/types";
import { buildDailyReview, buildImagePairs, buildKanjiToMeaning, buildMemoryPairs, buildPictureToKanji, buildReadingChallenge, buildSpeedPool, filterPool, type MatchPair } from "@/lib/games/builders";
import type { GameState } from "@/lib/games/engine";
import { dailyFocusKeys } from "@/lib/games/focus";
import { mulberry32, randomSeed } from "@/lib/rng";
import { buildWordBuilder, wbQuality, wbScore, wordBuilderEligible, type WbPuzzle } from "@/lib/games/word-builder";
import { itemKey, recordGameRound, reviewItem } from "@/lib/progress/model";
import { qualityFromChoice } from "@/lib/srs";
import { recordActivity } from "@/lib/progress/actions";
import { progressStore, useProgress } from "@/lib/progress/store";
import { todayString } from "@/lib/dates";
import { LEVELS, type Level } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Alert, Skeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Ja } from "@/components/ja";
import { useToast } from "@/components/ui/toast";
import { QuizGame } from "@/components/games/quiz-game";
import { ImageMatchGame, MemoryGame, type MatchOutcome } from "@/components/games/match-game";
import { WordBuilderGame, type WordBuilderOutcome } from "@/components/games/word-builder-game";
import { cn } from "@/lib/utils";

export interface GameRunnerProps {
  mode: { id: string; title: string; titleJa: string; description: string; needsImage: boolean };
  items: GameItem[];
  topics: { value: string; label: string }[];
  defaults: { levels: Level[]; topics: string[]; count: number; requireImage: boolean };
  questionRefs: Record<string, string>;
}

type Phase = "setup" | "play" | "result";
const SPEED_SECONDS = 60;

interface Result {
  score: number;
  correct: number;
  answered: number;
  maxCombo: number;
  xp: number;
  wrong: { q: GameQuestion; chosen: string }[];
  minutes: number;
  detail?: string;
  badges: string[];
  /** Word Builder: các từ chưa ghép đúng ngay (để xem lại) */
  missed?: { word: string; reading: string; meaning: string }[];
}

export function GameRunner(props: GameRunnerProps) {
  const progress = useProgress();
  if (!progress) {
    return (
      <div role="status" aria-label="Đang tải" className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-52" />
      </div>
    );
  }
  return <Inner {...props} />;
}

function Inner({ mode, items, topics, defaults, questionRefs }: GameRunnerProps) {
  const progress = useProgress()!;
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<Phase>("setup");
  const [levels, setLevels] = React.useState<Level[]>(defaults.levels.length ? defaults.levels : [...LEVELS]);
  const [topic, setTopic] = React.useState("");
  const [count, setCount] = React.useState(defaults.count);
  const [timed, setTimed] = React.useState(true);
  const [questions, setQuestions] = React.useState<GameQuestion[]>([]);
  const [pairs, setPairs] = React.useState<MatchPair[]>([]);
  const [puzzles, setPuzzles] = React.useState<WbPuzzle[]>([]);
  const [result, setResult] = React.useState<Result | null>(null);
  const [runId, setRunId] = React.useState(0);

  const isBoard = mode.id === "image-matching" || mode.id === "memory-match";
  const isSpeed = mode.id === "speed-challenge";
  const isDaily = mode.id === "daily-review";
  const isBuilder = mode.id === "word-builder";

  const levelsWithItems = LEVELS.filter((l) => items.some((i) => i.level === l));
  const pool = filterPool(items, { levels, topics: topic ? [topic] : undefined });
  const builderCount = isBuilder ? wordBuilderEligible(pool).length : 0;
  const imageable = pool.filter((i) => i.imageUrl && i.imageable).length;
  const today = todayString();
  const focus = isDaily ? dailyFocusKeys(progress, today, questionRefs) : [];

  function toggleLevel(l: Level) {
    setLevels((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  }

  function start() {
    const rng = mulberry32(randomSeed());
    const base = { count, levels, topics: topic ? [topic] : undefined, requireImage: defaults.requireImage };
    let built: GameQuestion[] = [];
    let builtPairs: MatchPair[] = [];
    let builtPuzzles: WbPuzzle[] = [];
    switch (mode.id) {
      case "picture-to-kanji": built = buildPictureToKanji(items, { ...base, tier: 1 }, rng); break;
      case "kanji-to-meaning": built = buildKanjiToMeaning(items, { ...base, tier: 2 }, rng); break;
      case "reading-challenge": built = buildReadingChallenge(items, { ...base, tier: 2 }, rng); break;
      case "daily-review": built = buildDailyReview(items, focus, { ...base, levels: undefined, topics: undefined, tier: 2 }, rng); break;
      case "speed-challenge":
        built = ([1, 2, 3] as const).flatMap((tier) => buildSpeedPool(items, { ...base, count: 16, tier }, rng));
        built = built.map((q, i) => ({ ...q, id: `speed-challenge-${i}` }));
        break;
      case "image-matching": builtPairs = buildImagePairs(items, { ...base, count: Math.min(count, 6) }, rng); break;
      case "memory-match": builtPairs = buildMemoryPairs(items, { ...base, count: Math.min(count, 8) }, rng); break;
      case "word-builder": builtPuzzles = buildWordBuilder(items, base, rng); break;
    }
    if (isBoard ? builtPairs.length < 3 : isBuilder ? builtPuzzles.length < 3 : built.length < 3) {
      toast("Không đủ dữ liệu phù hợp để tạo ván chơi. Hãy chọn thêm cấp độ/chủ đề hoặc nhờ quản trị viên bổ sung.", "error");
      return;
    }
    setQuestions(built);
    setPairs(builtPairs);
    setPuzzles(builtPuzzles);
    setRunId((n) => n + 1);
    setPhase("play");
  }

  const finishQuiz = React.useCallback(
    (s: GameState, startedAt: number) => {
      const today = todayString();
      const answeredQs = s.questions.filter((q) => s.answers[q.id]);
      const minutes = Math.max(0.1, Math.round(((Date.now() - startedAt) / 60000) * 10) / 10);
      const xp = Math.round(s.score / 2);
      const badges = recordActivity({ minutes, xp, reviews: answeredQs.length }, (p) => {
        let next = recordGameRound(p, mode.id, { score: s.score, correct: s.correct, answered: answeredQs.length });
        // Trò chơi trắc nghiệm có 25% đoán mò → chất lượng SM-2 tối đa 4
        for (const q of answeredQs) {
          const a = s.answers[q.id];
          next = reviewItem(next, q.itemKey, qualityFromChoice(a.correct, a.ms), today);
        }
        return next;
      });
      for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
      setResult({
        score: s.score, correct: s.correct, answered: answeredQs.length, maxCombo: s.maxCombo, xp, minutes, badges,
        wrong: answeredQs.filter((q) => !s.answers[q.id].correct).map((q) => ({ q, chosen: s.answers[q.id].optionId })),
      });
      setPhase("result");
    },
    [mode.id, toast],
  );

  const finishBoard = React.useCallback(
    (o: MatchOutcome) => {
      const today = todayString();
      const mistakesTotal = Object.values(o.mistakes).reduce((a, b) => a + b, 0);
      const score = Math.max(0, o.pairs.length * 10 - mistakesTotal * 2);
      const minutes = Math.max(0.1, Math.round(((Date.now() - o.startedAt) / 60000) * 10) / 10);
      const xp = Math.round(score / 2);
      const badges = recordActivity({ minutes, xp, reviews: o.pairs.length }, (p) => {
        let next = recordGameRound(p, mode.id, { score, correct: o.pairs.length - Object.keys(o.mistakes).length, answered: o.pairs.length });
        for (const pr of o.pairs) {
          const m = o.mistakes[pr.id] ?? 0;
          next = reviewItem(next, pr.itemKey, m === 0 ? 4 : m === 1 ? 3 : 2, today);
        }
        return next;
      });
      for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
      setResult({ score, correct: o.pairs.length, answered: o.pairs.length, maxCombo: 0, xp, minutes, badges, wrong: [], detail: `${o.moves} lượt, ${mistakesTotal} lần ghép sai` });
      setPhase("result");
    },
    [mode.id, toast],
  );

  const finishBuilder = React.useCallback(
    (o: WordBuilderOutcome) => {
      const today = todayString();
      const rows = o.puzzles.map((pz) => ({ pz, r: o.results[pz.id] ?? { wrong: 0, hints: 0, revealed: true } }));
      const score = rows.reduce((a, { r }) => a + wbScore(r), 0);
      const correct = rows.filter(({ r }) => !r.revealed).length;
      const minutes = Math.max(0.1, Math.round(((Date.now() - o.startedAt) / 60000) * 10) / 10);
      const xp = Math.round(score / 2);
      const badges = recordActivity({ minutes, xp, reviews: rows.length }, (p) => {
        let next = recordGameRound(p, mode.id, { score, correct, answered: rows.length });
        for (const { pz, r } of rows) next = reviewItem(next, pz.itemKey, wbQuality(r), today);
        return next;
      });
      for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
      const hints = rows.reduce((a, { r }) => a + r.hints, 0);
      setResult({
        score, correct, answered: rows.length, maxCombo: 0, xp, minutes, badges, wrong: [],
        detail: hints > 0 ? `${hints} lần dùng gợi ý` : undefined,
        missed: rows.filter(({ r }) => r.revealed || r.wrong > 0 || r.hints > 0).map(({ pz }) => ({ word: pz.word, reading: pz.reading, meaning: pz.meaning })),
      });
      setPhase("result");
    },
    [mode.id, toast],
  );

  const best = progress.games[mode.id]?.best ?? 0;

  /* ───────── SETUP ───────── */
  if (phase === "setup") {
    const needImg = mode.needsImage;
    const notEnough = isDaily ? focus.length < 4 : isBuilder ? builderCount < 4 : needImg ? imageable < 4 : pool.length < 4;
    return (
      <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardTitle>Thiết lập ván chơi</CardTitle>
          {isDaily ? (
            <div className="mt-3 text-sm">
              <p>Có <strong>{focus.length}</strong> mục cần chú ý hôm nay (đến hạn ôn, hay quên, hoặc gắn với câu làm sai).</p>
              {focus.length < 4 ? (
                <Alert tone="info" className="mt-3">
                  Chưa đủ mục để tạo ván Daily Review. Hãy học thêm trong <Link className="underline" href="/review">Ôn tập</Link> hoặc chơi các chế độ khác trước — các mục bạn trả lời sai/đến hạn sẽ xuất hiện ở đây.
                </Alert>
              ) : null}
            </div>
          ) : (
            <>
              <fieldset className="mt-3">
                <legend className="mb-1 text-sm font-medium">Cấp độ</legend>
                <div className="flex flex-wrap gap-2">
                  {levelsWithItems.map((l) => (
                    <label key={l} className={cn("nc-touch flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm", levels.includes(l) ? "border-primary bg-muted" : "border-border")}>
                      <input type="checkbox" checked={levels.includes(l)} onChange={() => toggleLevel(l)} className="accent-[var(--primary)]" />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Chủ đề
                  <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                    <option value="">Tất cả chủ đề</option>
                    {topics.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </label>
                {!isSpeed ? (
                  <label className="text-sm">{isBoard ? "Số cặp" : isBuilder ? "Số từ" : "Số câu"}
                    <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                      {(isBoard ? [4, 5, 6, 8] : [5, 10, 15, 20]).map((n) => <option key={n} value={n}>{n}</option>)}
                    </Select>
                  </label>
                ) : (
                  <div className="flex items-end gap-2 text-sm">
                    <Switch checked={timed} onChange={setTimed} label="Tính giờ 60 giây" id="timed" />
                    <label htmlFor="timed">Tính giờ {SPEED_SECONDS} giây</label>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {isBuilder ? `${builderCount} từ ghép được (cách đọc là kana, 2–6 mảnh)` : `${pool.length} mục phù hợp${needImg ? `, trong đó ${imageable} mục cụ thể có hình minh họa` : ""}`}.
              </p>
              {notEnough ? (
                <Alert tone="warning" className="mt-3">
                  {needImg ? "Cần ít nhất 4 mục cụ thể có hình minh họa để chơi chế độ này. Hãy chọn thêm cấp độ/chủ đề." : isBuilder ? "Cần ít nhất 4 từ có thể ghép. Hãy chọn thêm cấp độ/chủ đề." : "Cần ít nhất 4 mục để tạo câu hỏi. Hãy chọn thêm cấp độ/chủ đề."}
                </Alert>
              ) : null}
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="lg" onClick={start} disabled={notEnough}>Bắt đầu chơi</Button>
            <ButtonLink href="/games" variant="ghost" size="lg">Chọn chế độ khác</ButtonLink>
          </div>
        </Card>
        <Card>
          <CardTitle>{mode.title}</CardTitle>
          <Ja text={mode.titleJa} className="text-sm text-muted-foreground" as="p" />
          <p className="mt-2 text-sm">{mode.description}</p>
          <p className="mt-3 text-sm text-muted-foreground">Điểm cao nhất của bạn: <strong className="text-foreground">{best}</strong></p>
          <p className="mt-3 text-xs text-muted-foreground">Điểm/XP chỉ là phần thưởng vui. Mức ghi nhớ thật được tính riêng bằng lịch ôn SM-2 dựa trên việc bạn trả lời đúng/sai và tốc độ.</p>
        </Card>
      </div>
    );
  }

  /* ───────── PLAY ───────── */
  if (phase === "play") {
    if (isBoard) {
      return mode.id === "image-matching" ? <ImageMatchGame key={runId} pairs={pairs} onFinish={finishBoard} /> : <MemoryGame key={runId} pairs={pairs} onFinish={finishBoard} />;
    }
    if (isBuilder) return <WordBuilderGame key={runId} puzzles={puzzles} onFinish={finishBuilder} />;
    return <QuizGame key={runId} questions={questions} timeLimitSec={isSpeed && timed ? SPEED_SECONDS : null} autoAdvance={isSpeed} onFinish={finishQuiz} />;
  }

  /* ───────── RESULT ───────── */
  const r = result!;
  const isRecord = r.score > 0 && r.score >= (progressStore.get()?.games[mode.id]?.best ?? 0);
  return (
    <div className="mx-auto max-w-2xl space-y-[var(--gap)]">
      <Card className="text-center">
        <p className="text-sm text-muted-foreground">{mode.title}</p>
        <p className="mt-1 text-5xl font-bold tabular-nums">{r.score}<span className="text-xl text-muted-foreground"> điểm</span></p>
        {isRecord ? <p className="mt-1 text-sm font-semibold text-accent-text">Điểm cao nhất của bạn!</p> : null}
        <p className="mt-2 text-sm">{r.correct}/{r.answered} {isBoard ? "cặp" : isBuilder ? "từ ghép được (không xem đáp án)" : "câu đúng"}{r.maxCombo >= 2 ? ` · combo cao nhất ×${r.maxCombo}` : ""}{r.detail ? ` · ${r.detail}` : ""}</p>
        <p className="mt-1 text-sm text-muted-foreground">+{r.xp} XP · {r.minutes} phút</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={start}>Chơi lại</Button>
          <Button variant="outline" onClick={() => setPhase("setup")}>Đổi thiết lập</Button>
          <ButtonLink href="/games" variant="ghost">Chế độ khác</ButtonLink>
        </div>
      </Card>
      {r.missed && r.missed.length > 0 ? (
        <Card>
          <CardTitle>Từ cần xem lại ({r.missed.length})</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {r.missed.map((m) => (
              <li key={m.word + m.reading} className="border-t border-border pt-2 first:border-0 first:pt-0">
                <Ja text={m.word} className="text-lg" /> <span className="text-muted-foreground">（<Ja text={m.reading} />）</span> — {m.meaning}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {r.wrong.length > 0 ? (
        <Card>
          <CardTitle>Cần xem lại ({r.wrong.length})</CardTitle>
          <ul className="mt-3 space-y-3 text-sm">
            {r.wrong.map(({ q, chosen }) => {
              const right = q.options.find((o) => o.id === q.correctId)!;
              const mine = q.options.find((o) => o.id === chosen);
              return (
                <li key={q.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                  <p>{q.prompt.kind === "text" ? <Ja text={q.prompt.text} className="text-lg" /> : <span>(câu hỏi hình)</span>}</p>
                  <p>Bạn chọn: <span className="text-danger">{mine?.text}</span> · Đúng: <span className="font-medium text-success">{right.text}</span></p>
                  <p className="text-muted-foreground">{q.explanation}</p>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
