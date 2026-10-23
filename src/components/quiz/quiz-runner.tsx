"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JLPT_OFFICIAL, SKILL_LABELS, type ExamSkill } from "@/config/jlpt";
import { isCorrect, pickQuestions, QUIZ_KIND_LABELS, shuffleOptions, xpForQuiz, type QuizKind, type QuizPassage, type QuizQuestion } from "@/lib/quiz";
import { scoreAnswers, summarizeBySection, mockTimeLimitSeconds, type AnswerRecord } from "@/lib/scoring";
import { mulberry32, randomSeed, shuffle } from "@/lib/rng";
import { addQuizResult, itemKey, recordWrongAnswers, reviewItem, unresolvedWrongIds, type QuizResultRecord } from "@/lib/progress/model";
import { qualityFromChoice } from "@/lib/srs";
import { recordActivity } from "@/lib/progress/actions";
import { useProgress } from "@/lib/progress/store";
import { todayString } from "@/lib/dates";
import { formatDuration, uid } from "@/lib/utils";
import type { Level } from "@/lib/types";
import { Ja } from "@/components/ja";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { Alert, EmptyState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CheckCircle2, XCircle } from "@/components/icons";
import { ListeningPlayer } from "@/components/quiz/listening-player";
import { cn } from "@/lib/utils";

interface Props {
  questions: QuizQuestion[];
  passages: Record<string, QuizPassage>;
  kind: QuizKind;
  level: Level | "mixed";
  skill: ExamSkill | "mixed";
  /** true: bộ câu là các câu đã làm sai (lọc theo tiến độ trên trình duyệt) */
  wrongMode: boolean;
  backHref: string;
  /** Bộ đề do Admin soạn: giữ nguyên số câu; thứ tự theo Admin trừ khi bật xáo. */
  fixedSet?: { id: string; title: string; description: string; shuffle: boolean; dropped: number };
}

type Phase = "setup" | "running" | "result";

interface Session {
  id: string;
  seed: number;
  questions: QuizQuestion[];
  startedAt: number;
  endAt: number | null;
}

interface Answer {
  chosen: string | null;
  correct: boolean;
  ms: number;
}

const COUNT_CHOICES = [5, 10, 15, 20, 30];

export function QuizRunner(props: Props) {
  const progress = useProgress();
  if (!progress) {
    return (
      <div role="status" aria-label="Đang tải" className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  const wrongIds = new Set(unresolvedWrongIds(progress));
  const pool = props.wrongMode ? props.questions.filter((q) => wrongIds.has(q.id)) : props.questions;
  return <Inner {...props} pool={pool} />;
}

function Inner({ pool, passages, kind, level, skill, wrongMode, backHref, fixedSet }: Props & { pool: QuizQuestion[] }) {
  const [phase, setPhase] = React.useState<Phase>("setup");
  const [count, setCount] = React.useState(() => Math.min(pool.length, kind === "mock" ? 20 : 10));
  const [session, setSession] = React.useState<Session | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, Answer>>({});
  const [index, setIndex] = React.useState(0);
  const [now, setNow] = React.useState(() => Date.now());
  const questionShownAt = React.useRef(0);
  const finishedRef = React.useRef(false);
  const { toast } = useToast();
  const router = useRouter();
  const [exitOpen, setExitOpen] = React.useState(false);

  const timeLimit = kind === "mock" && session ? session.endAt : null;
  const total = session?.questions.length ?? 0;
  const current = session?.questions[index];

  function start() {
    const seed = randomSeed();
    const rng = mulberry32(seed);
    const base = fixedSet ? (fixedSet.shuffle ? shuffle(pool, rng) : pool) : pickQuestions(pool, { count, kind, rng });
    const picked = base.map((q) => shuffleOptions(q, rng));
    const startedAt = Date.now();
    setSession({
      id: uid("quiz-"),
      seed,
      questions: picked,
      startedAt,
      endAt: kind === "mock" ? startedAt + mockTimeLimitSeconds(picked.length) * 1000 : null,
    });
    setAnswers({});
    setIndex(0);
    finishedRef.current = false;
    questionShownAt.current = Date.now();
    setPhase("running");
  }

  // Đồng hồ thi thử (dựa trên mốc kết thúc → không lệch khi tab bị trình duyệt làm chậm)
  React.useEffect(() => {
    if (phase !== "running" || !timeLimit) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase, timeLimit]);

  const finish = React.useCallback(
    (finalAnswers: Record<string, Answer>) => {
      if (!session || finishedRef.current) return; // chống ghi kết quả hai lần
      finishedRef.current = true;
      const records: AnswerRecord[] = session.questions.map((q) => {
        const a = finalAnswers[q.id];
        return { questionId: q.id, skill: q.skill, chosenOptionId: a?.chosen ?? null, correct: a?.correct ?? false };
      });
      const score = scoreAnswers(records);
      const durationSec = Math.round((Date.now() - session.startedAt) / 1000);
      const today = todayString();
      const rec: QuizResultRecord = {
        id: session.id,
        at: new Date().toISOString(),
        date: today,
        kind,
        level,
        skill,
        total: score.total,
        correct: score.correct,
        percent: score.total === 0 ? 0 : (score.correct / score.total) * 100,
        durationSec,
        bySkill: Object.fromEntries(Object.entries(score.bySkill).map(([k, v]) => [k, { total: v!.total, correct: v!.correct }])),
        questionIds: session.questions.map((q) => q.id),
      };
      const answered = session.questions.filter((q) => finalAnswers[q.id]?.chosen != null);
      const badges = recordActivity(
        { minutes: Math.max(0.1, Math.round((durationSec / 60) * 10) / 10), xp: xpForQuiz(kind, score.correct), reviews: answered.length },
        (p) => {
          let next = addQuizResult(p, rec);
          next = recordWrongAnswers(next, answered.map((q) => ({ questionId: q.id, correct: finalAnswers[q.id].correct })), today);
          // Câu hỏi gắn với một mục từ/Kanji/ngữ pháp → cập nhật lịch ôn của mục đó (SM-2)
          for (const q of answered) {
            if (!q.ref_type || !q.ref_id) continue;
            const a = finalAnswers[q.id];
            next = reviewItem(next, itemKey(q.ref_type, q.ref_id), qualityFromChoice(a.correct, a.ms), today);
          }
          return next;
        },
      );
      for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
      setPhase("result");
    },
    [session, kind, level, skill, toast],
  );

  // Hết giờ thi thử
  React.useEffect(() => {
    if (phase === "running" && timeLimit && now >= timeLimit) finish(answers);
  }, [phase, timeLimit, now, answers, finish]);

  function choose(optionId: string) {
    if (!current || answers[current.id]) return; // khóa: mỗi câu chỉ ghi nhận một lần
    const a: Answer = { chosen: optionId, correct: isCorrect(current, optionId), ms: Date.now() - questionShownAt.current };
    setAnswers((prev) => ({ ...prev, [current.id]: a }));
  }

  function next() {
    if (!current) return;
    const answeredNow = answers[current.id];
    // Với bài kiểm tra/thi thử cho phép bỏ trống câu (tính là chưa trả lời)
    const finalAnswers = answeredNow ? answers : { ...answers };
    if (index + 1 >= total) {
      finish(finalAnswers);
    } else {
      setIndex((i) => i + 1);
      questionShownAt.current = Date.now();
    }
  }

  // Phím tắt: 1–6 chọn phương án, Enter/→ sang câu kế
  React.useEffect(() => {
    if (phase !== "running" || !current) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const n = Number(e.key);
      if (n >= 1 && n <= current.options.length) {
        e.preventDefault();
        choose(current.options[n - 1].id);
      } else if ((e.key === "Enter" || e.key === "ArrowRight") && (answers[current.id] || kind !== "practice")) {
        if (e.key === "Enter" && t?.tagName === "BUTTON") return; // để nút tự xử lý
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ───────────── SETUP ───────────── */
  if (phase === "setup") {
    if (pool.length === 0) {
      return (
        <EmptyState
          title={wrongMode ? "Bạn chưa có câu sai nào cần ôn" : "Chưa có câu hỏi phù hợp"}
          description={wrongMode ? "Làm vài bài luyện tập — những câu sai sẽ được lưu ở đây để bạn làm lại." : "Bộ lọc hiện tại chưa có câu hỏi nào. Quản trị viên có thể thêm câu hỏi trong /admin."}
          action={<ButtonLink href={backHref} variant="outline">Quay lại</ButtonLink>}
        />
      );
    }
    const choices = [...new Set([...COUNT_CHOICES.filter((c) => c < pool.length), pool.length])].sort((a, b) => a - b);
    const secs = mockTimeLimitSeconds(fixedSet ? pool.length : Math.min(count, pool.length));
    return (
      <Card className="max-w-xl">
        <CardTitle>{fixedSet ? fixedSet.title : `${QUIZ_KIND_LABELS[kind]}${wrongMode ? " — làm lại câu sai" : ""}`}</CardTitle>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Cấp: {level === "mixed" ? "nhiều cấp" : level} · Kỹ năng: {skill === "mixed" ? "tổng hợp" : SKILL_LABELS[skill]}</li>
          <li>Có {pool.length} câu phù hợp trong dữ liệu hiện tại.</li>
          {kind === "practice" ? <li>Có phản hồi và giải thích ngay sau mỗi câu.</li> : null}
          {kind === "test" ? <li>Không có phản hồi trong lúc làm; xem kết quả và giải thích khi nộp bài.</li> : null}
          {kind === "mock" ? <li>Có đồng hồ đếm ngược {formatDuration(secs)} (rút gọn: 60 giây/câu, <strong>không phải</strong> thời gian thi thật). Hết giờ bài tự nộp.</li> : null}
        </ul>
        {fixedSet ? (
          <div className="mt-3 text-sm">
            {fixedSet.description ? <p>{fixedSet.description}</p> : null}
            <p className="mt-1 text-muted-foreground">Bộ đề gồm {pool.length} câu{fixedSet.shuffle ? ", thứ tự được xáo mỗi lần làm" : ", theo đúng thứ tự quản trị viên sắp xếp"}.</p>
            {fixedSet.dropped > 0 ? <Alert tone="info" className="mt-2">{fixedSet.dropped} câu trong bộ đề hiện không hiển thị với người học (đã ẩn hoặc còn là bản nháp) nên được bỏ qua.</Alert> : null}
          </div>
        ) : (
          <div className="mt-4 max-w-[12rem]">
            <label htmlFor="quiz-count" className="mb-1 block text-sm font-medium">Số câu</label>
            <Select id="quiz-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {choices.map((c) => (
                <option key={c} value={c}>{c} câu</option>
              ))}
            </Select>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="lg" onClick={start}>Bắt đầu</Button>
          <ButtonLink href={backHref} variant="ghost" size="lg">Quay lại</ButtonLink>
        </div>
      </Card>
    );
  }

  /* ───────────── RESULT ───────────── */
  if (phase === "result" && session) {
    return <Result session={session} answers={answers} kind={kind} level={level} passages={passages} backHref={backHref} onRetry={start} />;
  }

  /* ───────────── RUNNING ───────────── */
  if (!current) return null;
  const answer = answers[current.id];
  const showFeedback = kind === "practice" && !!answer;
  const passage = current.passage_id ? passages[current.passage_id] : null;
  const remaining = timeLimit ? Math.max(0, Math.ceil((timeLimit - now) / 1000)) : null;
  const isLast = index + 1 >= total;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Câu {index + 1}/{total}</span>
        <span className="flex items-center gap-2">
          <Badge>{SKILL_LABELS[current.skill]}</Badge>
          {remaining !== null ? (
            <span role="timer" aria-label={`Còn ${formatDuration(remaining)}`} className={cn("font-mono tabular-nums", remaining <= 60 && "font-bold text-danger")}>
              {formatDuration(remaining)}
            </span>
          ) : null}
        </span>
      </div>
      <Progress value={index + (answer ? 1 : 0)} max={total} label="Tiến độ bài làm" />

      <Card>
        {passage?.kind === "reading" ? (
          <div className="mb-4 rounded-md bg-muted p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{passage.title}</p>
            {passage.body.split(/\n{2,}/).map((para, i) => (
              <Ja key={i} text={para} as="p" className="mb-2 text-lg last:mb-0" />
            ))}
          </div>
        ) : null}
        {passage?.kind === "listening" ? (
          <div className="mb-4">
            <ListeningPlayer passage={passage} />
          </div>
        ) : null}
        <Ja text={current.stem} className="text-xl" as="p" romaji />
        <ul className="mt-4 space-y-2" aria-label="Phương án trả lời">
          {current.options.map((o, i) => {
            const picked = answer?.chosen === o.id;
            const isRight = o.id === current.correct_option_id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={!!answer}
                  onClick={() => choose(o.id)}
                  aria-pressed={picked}
                  className={cn(
                    "nc-touch flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                    !answer && "border-border hover:bg-muted",
                    answer && !showFeedback && picked && "border-primary bg-muted",
                    answer && !showFeedback && !picked && "border-border opacity-70",
                    showFeedback && isRight && "border-success bg-[color-mix(in_oklab,var(--success)_12%,var(--card))]",
                    showFeedback && picked && !isRight && "nc-shake border-danger bg-[color-mix(in_oklab,var(--danger)_12%,var(--card))]",
                    showFeedback && !picked && !isRight && "border-border opacity-60",
                  )}
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-xs font-semibold">{i + 1}</span>
                  <Ja text={o.text} className="flex-1 text-lg" />
                  {showFeedback && isRight ? <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 size={18} aria-hidden="true" /><span>Đáp án đúng</span></span> : null}
                  {showFeedback && picked && !isRight ? <span className="flex items-center gap-1 text-sm text-danger"><XCircle size={18} aria-hidden="true" /><span>Bạn chọn</span></span> : null}
                </button>
              </li>
            );
          })}
        </ul>

        {showFeedback ? (
          <div role="status" className="nc-pop mt-4 rounded-md border border-border p-3 text-sm">
            <p className={cn("font-semibold", answer.correct ? "text-success" : "text-danger")}>{answer.correct ? "Chính xác!" : "Chưa đúng."}</p>
            <p className="mt-1">{current.explanation_vi}</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {current.options.filter((o) => o.explanation_vi && (o.id === answer.chosen || o.id === current.correct_option_id)).map((o) => (
                <li key={o.id}><Ja text={o.text} className="font-medium text-foreground" />: {o.explanation_vi}</li>
              ))}
            </ul>
            {passage?.kind === "listening" ? <Script passage={passage} /> : null}
            {current.status !== "verified" && current.status !== "published" ? (
              <p className="mt-2 text-xs text-warning">Câu hỏi này do AI soạn và chưa được giáo viên xác minh — nếu thấy sai, hãy báo cho quản trị viên.</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setExitOpen(true)}>
          Thoát
        </Button>
        <div className="flex gap-2">
          {kind !== "practice" && !answer ? <Button variant="outline" onClick={next}>{isLast ? "Bỏ trống & nộp bài" : "Bỏ qua câu này"}</Button> : null}
          {(answer || kind === "practice") ? (
            <Button disabled={kind === "practice" && !answer} onClick={next}>{isLast ? "Nộp bài" : "Câu tiếp"}</Button>
          ) : null}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Phím tắt: 1–{current.options.length} chọn đáp án · Enter/→ câu tiếp</p>
      <ConfirmDialog
        open={exitOpen}
        onCancel={() => setExitOpen(false)}
        onConfirm={() => router.push(backHref)}
        title="Thoát bài làm?"
        message="Kết quả của bài đang làm sẽ không được lưu."
        confirmLabel="Thoát"
        danger
      />
    </div>
  );
}

function Script({ passage }: { passage: QuizPassage }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-primary">Xem kịch bản bài nghe</summary>
      <ul className="mt-1 space-y-1">
        {passage.script.map((l, i) => (
          <li key={i}>
            <span className="text-xs text-muted-foreground">{l.speaker}: </span>
            <Ja text={l.text} romaji={false} /> <span className="text-muted-foreground">— {l.vi}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Result({
  session, answers, kind, level, passages, backHref, onRetry,
}: {
  session: Session; answers: Record<string, Answer>; kind: QuizKind; level: Level | "mixed";
  passages: Record<string, QuizPassage>; backHref: string; onRetry: () => void;
}) {
  const records: AnswerRecord[] = session.questions.map((q) => ({
    questionId: q.id, skill: q.skill, chosenOptionId: answers[q.id]?.chosen ?? null, correct: answers[q.id]?.correct ?? false,
  }));
  const score = scoreAnswers(records);
  const durationSec = Math.round((Date.now() - session.startedAt) / 1000);
  const sections = kind === "mock" && level !== "mixed" ? summarizeBySection(level, score.bySkill) : null;
  const wrong = session.questions.filter((q) => !answers[q.id]?.correct);
  const pct = Math.round(score.ratio * 100);
  const officialMax = level !== "mixed" ? JLPT_OFFICIAL[level].totalMax : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-[var(--gap)]">
      <Card>
        <p className="text-sm text-muted-foreground">{QUIZ_KIND_LABELS[kind]} · {level === "mixed" ? "nhiều cấp" : level}</p>
        <p className="mt-1 text-5xl font-bold tabular-nums">{score.correct}<span className="text-2xl text-muted-foreground">/{score.total}</span></p>
        <p className="mt-1">{pct}% câu đúng · thời gian {formatDuration(durationSec)}{score.unansweredIds.length > 0 ? ` · ${score.unansweredIds.length} câu bỏ trống` : ""}</p>
        <Progress value={pct} label="Tỉ lệ đúng" tone={pct >= 70 ? "success" : pct >= 40 ? "warning" : "accent"} className="mt-3" />
        <div className="mt-3 space-y-1.5">
          {Object.entries(score.bySkill).map(([sk, v]) => (
            <div key={sk} className="flex items-center justify-between text-sm">
              <span>{SKILL_LABELS[sk as ExamSkill]}</span>
              <span className="tabular-nums">{v!.correct}/{v!.total}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onRetry}>Làm lại bộ khác</Button>
          <ButtonLink href={backHref} variant="outline">Quay lại</ButtonLink>
          <ButtonLink href="/progress" variant="ghost">Xem lịch sử</ButtonLink>
        </div>
      </Card>

      {sections ? (
        <Card>
          <CardTitle>Kết quả theo phần chấm điểm của {level}</CardTitle>
          <ul className="mt-2 space-y-1.5 text-sm">
            {sections.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span>{s.name}</span>
                <span className="tabular-nums">{s.ratio === null ? "chưa có câu" : `${s.correct}/${s.total} (${Math.round(s.ratio * 100)}%)`}</span>
              </li>
            ))}
          </ul>
          <Alert tone="info" className="mt-3">
            Đây là <strong>tỉ lệ đúng thô</strong> trên bộ câu hỏi mẫu của app. App <strong>không</strong> quy đổi sang thang {officialMax} điểm hay kết luận đỗ/trượt vì kỳ thi thật dùng cách quy đổi điểm riêng và không công bố công thức.
          </Alert>
        </Card>
      ) : null}

      {wrong.length > 0 ? (
        <Card>
          <CardTitle>Các câu cần xem lại ({wrong.length})</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Những câu này đã được lưu vào “Câu sai” để làm lại sau.</p>
          <ol className="mt-3 space-y-4">
            {wrong.map((q) => {
              const a = answers[q.id];
              const chosen = q.options.find((o) => o.id === a?.chosen);
              const right = q.options.find((o) => o.id === q.correct_option_id);
              return (
                <li key={q.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                  <Ja text={q.stem} as="p" className="text-lg" />
                  <p className="mt-1 text-sm">Bạn chọn: {chosen ? <Ja text={chosen.text} className="text-danger" /> : <em>bỏ trống</em>}</p>
                  <p className="text-sm">Đáp án đúng: {right ? <Ja text={right.text} className="font-medium text-success" /> : null}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{q.explanation_vi}</p>
                  {q.passage_id && passages[q.passage_id]?.kind === "listening" ? <Script passage={passages[q.passage_id]} /> : null}
                </li>
              );
            })}
          </ol>
        </Card>
      ) : (
        <Alert tone="success" title="Bạn trả lời đúng tất cả!">Hãy thử bộ khác hoặc tăng độ khó.</Alert>
      )}
      <p className="text-center text-xs text-muted-foreground">Mã bài: {session.id}</p>
      <Link href={backHref} className="sr-only">Quay lại</Link>
    </div>
  );
}
