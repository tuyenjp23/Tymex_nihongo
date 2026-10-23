"use client";
import * as React from "react";
import Link from "next/link";
import { buildReviewQueue, formatInterval, previewIntervals, type ReviewItem } from "@/lib/review";
import { progressStore, useProgress } from "@/lib/progress/store";
import { reviewItem } from "@/lib/progress/model";
import { FLASHCARD_QUALITY, memoryStage, MEMORY_STAGE_LABELS } from "@/lib/srs";
import { todayString } from "@/lib/dates";
import { mulberry32, randomSeed } from "@/lib/rng";
import { recordActivity } from "@/lib/progress/actions";
import { LEVELS, type Level } from "@/lib/types";
import { Ja, Romaji } from "@/components/ja";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/form";
import { Skeleton, EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/content/speak-button";
import { Figure } from "@/components/content/figure";
import { useToast } from "@/components/ui/toast";

type Direction = "ja-vi" | "vi-ja";
type Phase = "setup" | "running" | "done";

const TYPE_LABEL = { vocabulary: "Từ vựng", kanji: "Kanji", grammar: "Ngữ pháp" } as const;

export function ReviewSession({ items }: { items: ReviewItem[] }) {
  const progress = useProgress();
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<Phase>("setup");
  const [level, setLevel] = React.useState<Level | "">("");
  const [type, setType] = React.useState<"" | "vocabulary" | "kanji" | "grammar">("");
  const [direction, setDirection] = React.useState<Direction>("ja-vi");
  const [newLimit, setNewLimit] = React.useState(10);
  const [queue, setQueue] = React.useState<ReviewItem[]>([]);
  const [pos, setPos] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [stats, setStats] = React.useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const lastActionAt = React.useRef(0);
  const lockRef = React.useRef(false);
  const requeued = React.useRef<Set<string>>(new Set());

  const today = todayString();
  const preview = React.useMemo(
    () => (progress ? buildReviewQueue(items, progress, today, { level, types: type ? [type] : undefined, newLimit, maxDue: 40, rng: mulberry32(1) }) : null),
    [items, progress, today, level, type, newLimit],
  );

  const current = queue[pos];

  const answer = React.useCallback(
    (quality: number, name: keyof typeof stats) => {
      if (!current || lockRef.current) return;
      lockRef.current = true;
      const now = Date.now();
      const sec = Math.min(90, (now - lastActionAt.current) / 1000);
      lastActionAt.current = now;
      const badges = recordActivity({ minutes: Math.round((sec / 60) * 10) / 10, xp: quality >= 3 ? 2 : 0, reviews: 1 }, (p) =>
        reviewItem(p, current.key, quality, todayString()),
      );
      for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
      setStats((s) => ({ ...s, [name]: s[name] + 1 }));
      // "Quên" → lặp lại một lần nữa cuối phiên
      let nextQueue = queue;
      if (quality < 3 && !requeued.current.has(current.key)) {
        requeued.current.add(current.key);
        nextQueue = [...queue, current];
        setQueue(nextQueue);
      }
      if (pos + 1 >= nextQueue.length) setPhase("done");
      else {
        setPos(pos + 1);
        setRevealed(false);
      }
      setTimeout(() => (lockRef.current = false), 120);
    },
    [current, pos, queue, toast],
  );

  // Phím tắt: Space/Enter lật thẻ; 1–4 chấm điểm
  React.useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        if (t?.tagName === "BUTTON") return;
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const map: Record<string, [number, keyof typeof stats]> = {
          "1": [FLASHCARD_QUALITY.again, "again"], "2": [FLASHCARD_QUALITY.hard, "hard"], "3": [FLASHCARD_QUALITY.good, "good"], "4": [FLASHCARD_QUALITY.easy, "easy"],
        };
        const m = map[e.key];
        if (m) {
          e.preventDefault();
          answer(m[0], m[1]);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, answer]);

  if (!progress || !preview) {
    return (
      <div role="status" aria-label="Đang tải" className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  function start() {
    if (!progress) return;
    const r = buildReviewQueue(items, progress, todayString(), { level, types: type ? [type] : undefined, newLimit, maxDue: 40, rng: mulberry32(randomSeed()) });
    requeued.current = new Set();
    setQueue(r.queue);
    setPos(0);
    setRevealed(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    lastActionAt.current = Date.now();
    setPhase(r.queue.length > 0 ? "running" : "setup");
  }

  if (phase === "setup") {
    const total = preview.dueUsed + preview.newUsed;
    return (
      <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardTitle>Phiên ôn tập hôm nay</CardTitle>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div><dt className="text-xs text-muted-foreground">Đến hạn</dt><dd className="text-3xl font-bold tabular-nums">{preview.dueTotal}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Mục mới</dt><dd className="text-3xl font-bold tabular-nums">{preview.newUsed}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Phiên này</dt><dd className="text-3xl font-bold tabular-nums text-primary">{total}</dd></div>
          </dl>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Cấp độ
              <Select value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
                <option value="">Tất cả</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </label>
            <label className="text-sm">Loại
              <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="">Từ vựng + Kanji + Ngữ pháp</option>
                <option value="vocabulary">Từ vựng</option>
                <option value="kanji">Kanji</option>
                <option value="grammar">Ngữ pháp</option>
              </Select>
            </label>
            <label className="text-sm">Hướng thẻ
              <Select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
                <option value="ja-vi">Nhật → Việt (nhận diện)</option>
                <option value="vi-ja">Việt → Nhật (nhớ lại)</option>
              </Select>
            </label>
            <label className="text-sm">Mục mới tối đa
              <Select value={newLimit} onChange={(e) => setNewLimit(Number(e.target.value))}>
                {[0, 5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </label>
          </div>
          <div className="mt-5">
            {total === 0 ? (
              <EmptyState
                title="Hôm nay không có mục nào để ôn"
                description="Hãy mở thêm từ vựng/Kanji ở các mô-đun học, hoặc tăng số mục mới. Quay lại vào ngày mai để ôn các mục đến hạn."
                action={<ButtonLink href="/vocabulary" variant="outline">Mở từ vựng</ButtonLink>}
              />
            ) : (
              <Button size="lg" onClick={start}>Bắt đầu ôn {total} thẻ</Button>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Cách hoạt động</CardTitle>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Lịch ôn theo thuật toán SM-2: nhớ tốt thì khoảng ôn dài ra, quên thì quay lại sau 1 ngày.</li>
            <li>Điểm XP chỉ là phần thưởng vui, <strong>không</strong> ảnh hưởng lịch ôn.</li>
            <li>Thẻ bạn chấm “Quên” sẽ được hỏi lại một lần nữa cuối phiên.</li>
            <li>Phím tắt: Space lật thẻ, 1–4 chấm điểm.</li>
          </ul>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    const total = stats.again + stats.hard + stats.good + stats.easy;
    return (
      <Card className="mx-auto max-w-xl">
        <CardTitle>Hoàn thành phiên ôn!</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">Bạn đã chấm {total} lượt thẻ.</p>
        <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
          <div><dt className="text-muted-foreground">Quên</dt><dd className="text-2xl font-bold tabular-nums text-danger">{stats.again}</dd></div>
          <div><dt className="text-muted-foreground">Khó</dt><dd className="text-2xl font-bold tabular-nums text-warning">{stats.hard}</dd></div>
          <div><dt className="text-muted-foreground">Tốt</dt><dd className="text-2xl font-bold tabular-nums">{stats.good}</dd></div>
          <div><dt className="text-muted-foreground">Dễ</dt><dd className="text-2xl font-bold tabular-nums text-success">{stats.easy}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setPhase("setup")}>Về trang ôn tập</Button>
          <ButtonLink href="/progress" variant="outline">Xem tiến độ</ButtonLink>
        </div>
      </Card>
    );
  }

  if (!current) return null;
  const state = progress.srs[current.key];
  const stage = memoryStage(state);
  const iv = previewIntervals(state, today);
  const frontJa = direction === "ja-vi";

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span>Thẻ {Math.min(pos + 1, queue.length)}/{queue.length}</span>
        <span className="flex items-center gap-1.5"><Badge>{TYPE_LABEL[current.type]}</Badge><Badge tone="primary">{current.level}</Badge><Badge tone={stage === "new" ? "accent" : "neutral"}>{MEMORY_STAGE_LABELS[stage]}</Badge></span>
      </div>
      <Progress value={pos} max={queue.length} label="Tiến độ phiên ôn" />

      <Card className="min-h-72 text-center">
        <div className="flex min-h-56 flex-col items-center justify-center gap-3">
          {frontJa ? (
            <>
              <Ja text={current.front} className={current.type === "kanji" ? "jp-kanji" : "jp-xl"} />
              <SpeakButton text={current.reading || current.front} label="Nghe" />
              {revealed ? (
                <div className="nc-pop space-y-1">
                  <p className="jp text-lg">{current.reading}<Romaji reading={current.reading} className="nc-romaji-inline ml-2" /></p>
                  <p className="text-2xl font-semibold">{current.back}</p>
                  {current.detail ? <p className="text-sm text-muted-foreground">{current.detail}</p> : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold">{current.back}</p>
              {current.imageUrl ? <Figure src={current.imageUrl} alt={current.imageAlt ?? ""} className="h-24 w-24" /> : null}
              {revealed ? (
                <div className="nc-pop space-y-1">
                  <Ja text={current.front} className={current.type === "kanji" ? "jp-kanji" : "jp-xl"} />
                  <p className="jp text-lg">{current.reading}</p>
                  <SpeakButton text={current.reading || current.front} label="Nghe" className="mx-auto" />
                </div>
              ) : null}
            </>
          )}
          {frontJa && revealed && current.imageUrl ? <Figure src={current.imageUrl} alt={current.imageAlt ?? ""} className="h-20 w-20" /> : null}
        </div>
        <Link href={current.href} className="text-xs text-muted-foreground underline" target="_blank">Xem chi tiết (tab mới)</Link>
      </Card>

      {!revealed ? (
        <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>Hiện đáp án (Space)</Button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Chấm mức độ nhớ">
          <Button variant="danger" className="h-auto flex-col py-2" onClick={() => answer(FLASHCARD_QUALITY.again, "again")}><span>1 · Quên</span><span className="text-xs opacity-90">{formatInterval(iv.again)}</span></Button>
          <Button variant="secondary" className="h-auto flex-col py-2" onClick={() => answer(FLASHCARD_QUALITY.hard, "hard")}><span>2 · Khó</span><span className="text-xs text-muted-foreground">{formatInterval(iv.hard)}</span></Button>
          <Button variant="primary" className="h-auto flex-col py-2" onClick={() => answer(FLASHCARD_QUALITY.good, "good")}><span>3 · Tốt</span><span className="text-xs opacity-90">{formatInterval(iv.good)}</span></Button>
          <Button variant="accent" className="h-auto flex-col py-2" onClick={() => answer(FLASHCARD_QUALITY.easy, "easy")}><span>4 · Dễ</span><span className="text-xs opacity-90">{formatInterval(iv.easy)}</span></Button>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">Thời gian ôn lại kế tiếp hiển thị dưới mỗi nút.</p>
    </div>
  );
}

void progressStore;
