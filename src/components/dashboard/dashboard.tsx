"use client";
import * as React from "react";
import Link from "next/link";
import { useProgress, progressStore } from "@/lib/progress/store";
import { setGoals, studyDaysOf, type Progress } from "@/lib/progress/model";
import { computeStreak } from "@/lib/streak";
import { isDue, memoryStage } from "@/lib/srs";
import { todayString, formatDateVi } from "@/lib/dates";
import { LEVELS, type Level } from "@/lib/types";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Progress as Bar } from "@/components/ui/progress";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/icons";
import { Ja } from "@/components/ja";
import { dashboardSectionDefs } from "@/config/dashboard";

export interface DashboardLesson {
  id: string;
  title: string;
  level: Level;
  module: string;
  order: number;
  est: number;
}
export interface DashboardGame {
  id: string;
  title: string;
  titleJa: string;
  icon: string;
}
export interface DashboardData {
  sections: { id: string; enabled: boolean }[];
  lessons: DashboardLesson[];
  /** itemKey → level (để tính % đã học theo cấp) */
  itemLevels: Record<string, Level>;
  games: DashboardGame[];
  moduleLabels: Record<string, string>;
  enabledNav: string[];
}

const MINUTE_CHOICES = [5, 10, 15, 20, 30, 45, 60];
const XP_CHOICES = [50, 100, 150, 200, 300];

function SectionCard({ id, title, description, children, className }: { id: string; title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className} aria-labelledby={`dash-${id}`}>
      <CardTitle id={`dash-${id}`}>{title}</CardTitle>
      {description ? <CardDescription className="mt-0.5">{description}</CardDescription> : null}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const progress = useProgress();
  if (!progress) {
    return (
      <div role="status" aria-label="Đang tải tiến độ" className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }
  const today = todayString();
  const labels = Object.fromEntries(dashboardSectionDefs.map((d) => [d.id, d]));
  const isNew = Object.keys(progress.days).length === 0 && progress.quizzes.length === 0;

  const render: Record<string, () => React.ReactNode> = {
    goals: () => <Goals p={progress} today={today} />,
    streak: () => <Streak p={progress} today={today} />,
    "next-lesson": () => <NextLesson p={progress} data={data} />,
    "review-due": () => <ReviewDue p={progress} today={today} reviewEnabled={data.enabledNav.includes("review")} />,
    "jlpt-progress": () => <JlptProgress p={progress} data={data} />,
    "vocab-stats": () => <VocabStats p={progress} today={today} />,
    "last-score": () => <LastScore p={progress} />,
    continue: () => <Continue p={progress} data={data} />,
    "quick-games": () => <QuickGames data={data} />,
  };

  const ordered = data.sections.filter((s) => s.enabled && render[s.id]);

  return (
    <div className="space-y-[var(--gap)]">
      {isNew ? (
        <Card className="border-l-4 !border-l-primary">
          <CardTitle as="h2">Bắt đầu từ đâu?</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Bạn chưa có tiến độ nào. Chọn một trong ba cách mở đầu nhanh; mọi tiến độ được lưu ngay trong trình duyệt này.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/jlpt/N5">Học từ N5</ButtonLink>
            <ButtonLink href="/conversation" variant="outline">Xem hội thoại thực tế</ButtonLink>
            <ButtonLink href="/games" variant="outline">Chơi thử Kanji Quest</ButtonLink>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((s) => (
          <SectionCard
            key={s.id}
            id={s.id}
            title={labels[s.id]?.label ?? s.id}
            description={undefined}
            className={s.id === "jlpt-progress" || s.id === "quick-games" ? "sm:col-span-2 lg:col-span-2" : undefined}
          >
            {render[s.id]()}
          </SectionCard>
        ))}
      </div>
      {ordered.length === 0 ? <p className="text-sm text-muted-foreground">Quản trị viên đã tắt tất cả các khối trên trang tổng quan.</p> : null}
    </div>
  );
}

function Goals({ p, today }: { p: Progress; today: string }) {
  const d = p.days[today] ?? { minutes: 0, xp: 0, reviews: 0 };
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span>Thời gian học</span>
          <span className="tabular-nums">{Math.round(d.minutes)} / {p.goals.minutes} phút</span>
        </div>
        <Bar value={d.minutes} max={p.goals.minutes} label="Phút học hôm nay" tone="success" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span>Điểm XP</span>
          <span className="tabular-nums">{d.xp} / {p.goals.xp}</span>
        </div>
        <Bar value={d.xp} max={p.goals.xp} label="XP hôm nay" tone="accent" />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Đổi mục tiêu ngày</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs">
            Phút/ngày
            <Select
              value={p.goals.minutes}
              onChange={(e) => progressStore.update((x) => setGoals(x, { ...x.goals, minutes: Number(e.target.value) }))}
            >
              {[...new Set([...MINUTE_CHOICES, p.goals.minutes])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </label>
          <label className="text-xs">
            XP/ngày
            <Select value={p.goals.xp} onChange={(e) => progressStore.update((x) => setGoals(x, { ...x.goals, xp: Number(e.target.value) }))}>
              {[...new Set([...XP_CHOICES, p.goals.xp])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </label>
        </div>
      </details>
    </div>
  );
}

function Streak({ p, today }: { p: Progress; today: string }) {
  const s = computeStreak(studyDaysOf(p), today, 1);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <Icon name="flame" className={s.alive ? "text-accent" : "text-muted-foreground"} size={28} />
        <span className="text-4xl font-bold tabular-nums">{s.current}</span>
        <span className="text-sm text-muted-foreground">ngày liên tiếp</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {s.current === 0
          ? "Học một chút hôm nay để bắt đầu chuỗi mới."
          : s.studiedToday
            ? "Hôm nay bạn đã học rồi. Giữ nhịp nhé!"
            : s.usingRestDay
              ? "Hôm qua bạn nghỉ. Học hôm nay để giữ chuỗi (nghỉ 2 ngày liền thì chuỗi đứt)."
              : "Hôm nay chưa học — vẫn còn kịp."}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Chuỗi dài nhất: {s.longest} ngày · Cho phép nghỉ 1 ngày giữa chừng.</p>
    </div>
  );
}

function pickNextLesson(p: Progress, data: DashboardData): DashboardLesson | null {
  const sorted = [...data.lessons].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.order - b.order);
  const started = sorted.find((l) => p.lessons[l.id]?.status === "started");
  if (started) return started;
  return sorted.find((l) => p.lessons[l.id]?.status !== "done") ?? null;
}

function NextLesson({ p, data }: { p: Progress; data: DashboardData }) {
  const l = pickNextLesson(p, data);
  if (!l) return <p className="text-sm text-muted-foreground">Bạn đã hoàn thành mọi bài học hiện có. Hãy ôn tập hoặc thử thi thử.</p>;
  const started = p.lessons[l.id]?.status === "started";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="primary">{l.level}</Badge>
        <Badge>{data.moduleLabels[l.module] ?? l.module}</Badge>
        <span className="text-xs text-muted-foreground">~{l.est} phút</span>
      </div>
      <p className="mt-2 font-medium">{l.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Gợi ý theo thứ tự bài và việc bạn đã hoàn thành — không phải đánh giá trình độ.</p>
      <ButtonLink href={`/lessons/${l.id}`} className="mt-3" size="sm">{started ? "Tiếp tục" : "Bắt đầu bài"}</ButtonLink>
    </div>
  );
}

function ReviewDue({ p, today, reviewEnabled }: { p: Progress; today: string; reviewEnabled: boolean }) {
  const due = Object.values(p.srs).filter((s) => isDue(s, today)).length;
  const wrong = Object.values(p.wrong).filter((w) => !w.resolved).length;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">{due}</span>
        <span className="text-sm text-muted-foreground">mục đến hạn ôn</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{wrong} câu hỏi sai chưa khắc phục.</p>
      {reviewEnabled ? (
        <ButtonLink href="/review" className="mt-3" size="sm" variant={due > 0 ? "primary" : "outline"}>
          {due > 0 ? "Ôn ngay" : "Mở trang ôn tập"}
        </ButtonLink>
      ) : null}
    </div>
  );
}

function JlptProgress({ p, data }: { p: Progress; data: DashboardData }) {
  const totals: Record<string, { total: number; seen: number }> = {};
  for (const l of LEVELS) totals[l] = { total: 0, seen: 0 };
  for (const [key, level] of Object.entries(data.itemLevels)) {
    totals[level].total++;
    if (p.seen[key]) totals[level].seen++;
  }
  return (
    <div>
      <ul className="space-y-2.5">
        {LEVELS.map((l) => {
          const t = totals[l];
          return (
            <li key={l} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
              <Link href={`/jlpt/${l}`} className="font-semibold text-primary hover:underline">{l}</Link>
              <Bar value={t.seen} max={Math.max(t.total, 1)} label={`Tiến độ ${l}`} />
              <span className="text-xs tabular-nums text-muted-foreground">{t.seen}/{t.total}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Đếm số mục từ vựng/Kanji/ngữ pháp bạn đã mở trong dữ liệu hiện có của app (không phải toàn bộ yêu cầu của kỳ thi).
      </p>
    </div>
  );
}

function VocabStats({ p, today }: { p: Progress; today: string }) {
  const stages = { learning: 0, review: 0, mastered: 0 };
  let vocabSeen = 0;
  for (const key of Object.keys(p.seen)) if (key.startsWith("vocabulary:")) vocabSeen++;
  for (const [key, s] of Object.entries(p.srs)) {
    if (!key.startsWith("vocabulary:")) continue;
    const st = memoryStage(s);
    if (st !== "new") stages[st]++;
  }
  void today;
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-muted-foreground">Đã xem</dt><dd className="text-2xl font-bold tabular-nums">{vocabSeen}</dd></div>
      <div><dt className="text-muted-foreground">Đang học</dt><dd className="text-2xl font-bold tabular-nums">{stages.learning}</dd></div>
      <div><dt className="text-muted-foreground">Đang củng cố</dt><dd className="text-2xl font-bold tabular-nums">{stages.review}</dd></div>
      <div><dt className="text-muted-foreground">Thuộc vững</dt><dd className="text-2xl font-bold tabular-nums text-success">{stages.mastered}</dd></div>
    </dl>
  );
}

const KIND_LABEL = { practice: "Luyện tập", test: "Bài kiểm tra", mock: "Thi thử" } as const;

function LastScore({ p }: { p: Progress }) {
  const q = p.quizzes[0];
  if (!q) return <p className="text-sm text-muted-foreground">Chưa có bài làm nào. Làm một bài luyện tập để xem điểm tại đây.</p>;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">{q.correct}/{q.total}</span>
        <span className="text-sm text-muted-foreground">({Math.round(q.percent)}% đúng)</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {KIND_LABEL[q.kind]} · {q.level === "mixed" ? "nhiều cấp" : q.level} · {formatDateVi(q.date)}
      </p>
      <ButtonLink href="/progress" variant="outline" size="sm" className="mt-3">Xem lịch sử</ButtonLink>
    </div>
  );
}

function Continue({ p, data }: { p: Progress; data: DashboardData }) {
  const list = data.lessons.filter((l) => p.lessons[l.id]?.status === "started").slice(0, 4);
  if (list.length === 0) return <p className="text-sm text-muted-foreground">Không có bài nào đang dang dở.</p>;
  return (
    <ul className="space-y-2">
      {list.map((l) => (
        <li key={l.id}>
          <Link href={`/lessons/${l.id}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            <span className="min-w-0 truncate">{l.title}</span>
            <Badge tone="primary">{l.level}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function QuickGames({ data }: { data: DashboardData }) {
  if (data.games.length === 0) return <p className="text-sm text-muted-foreground">Chưa có chế độ chơi nào được bật.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {data.games.map((g) => (
        <li key={g.id}>
          <Link href={`/games/${g.id}`} className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 hover:bg-muted">
            <Icon name={g.icon} className="text-primary" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{g.title}</span>
              <Ja text={g.titleJa} className="block text-xs text-muted-foreground" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
