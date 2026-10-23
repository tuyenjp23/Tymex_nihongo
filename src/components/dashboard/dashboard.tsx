"use client";
import * as React from "react";
import Link from "next/link";
import { useProgress, progressStore } from "@/lib/progress/store";
import { setGoals, studyDaysOf, type Progress } from "@/lib/progress/model";
import { computeStreak } from "@/lib/streak";
import { isDue, memoryStage } from "@/lib/srs";
import { todayString, formatDateVi } from "@/lib/dates";
import { LEVELS, type Level } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress as Bar } from "@/components/ui/progress";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/icons";
import { JapanScene } from "@/components/art/japan-scene";
import { Ja } from "@/components/ja";
import { useItemLevels } from "@/lib/use-item-levels";
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
  /** Tên app và khẩu hiệu cho khu chào mừng */
  appName: string;
  tagline: string;
  sections: { id: string; enabled: boolean }[];
  lessons: DashboardLesson[];
  /** Tổng số từ vựng + Kanji + ngữ pháp theo cấp (đếm "đã xem" làm ở trình duyệt, xem useItemLevels) */
  levelTotals: Record<Level, number>;
  games: DashboardGame[];
  moduleLabels: Record<string, string>;
  enabledNav: string[];
}

const MINUTE_CHOICES = [5, 10, 15, 20, 30, 45, 60];
const XP_CHOICES = [50, 100, 150, 200, 300];

function SectionCard({ id, title, icon, children, className }: { id: string; title: string; icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)} aria-labelledby={`dash-${id}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon ? <span className="grid h-7 w-7 place-items-center rounded-md bg-[color-mix(in_oklab,var(--gold)_22%,var(--card))] text-gold-strong"><Icon name={icon} size={15} /></span> : null}
        <CardTitle id={`dash-${id}`} className="text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</CardTitle>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

/** Vòng tròn tiến độ (SVG). Có aria-label mô tả bằng chữ → không chỉ dựa vào màu. */
function Ring({ value, label }: { value: number; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={label} className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="color-mix(in oklab, var(--foreground) 10%, var(--background))" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 32 32)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--foreground)">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

function StatTile({ label, icon, children, className }: { label: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("nc-card flex flex-col gap-2", className)} style={{ padding: "calc(var(--card-padding) * 0.9)" }}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name={icon} size={16} className="text-gold-strong" />
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </div>
      {children}
    </div>
  );
}

function nextCta(p: Progress | null, data: DashboardData): { href: string; label: string; hint: string } {
  const l = pickNextLesson(p ?? emptyProgressLike, data);
  if (!l) return { href: "/jlpt/N5", label: "Tiếp tục học", hint: "Chọn cấp độ để bắt đầu" };
  const started = p?.lessons[l.id]?.status === "started";
  return { href: `/lessons/${l.id}`, label: "Tiếp tục học", hint: `${started ? "Đang dở" : "Bài tiếp theo"}: ${l.title}` };
}
// Khi chưa tải xong tiến độ: coi như chưa học gì → gợi ý bài đầu tiên
const emptyProgressLike = { lessons: {} } as unknown as Progress;

function Hero({ data, progress, notice }: { data: DashboardData; progress: Progress | null; notice?: React.ReactNode }) {
  const cta = nextCta(progress, data);
  return (
    <section className="nc-hero nc-rise" aria-label="Chào mừng">
      <JapanScene scene="hero" priority sizes="(max-width: 1152px) 100vw, 1152px" decorative position="60% 40%" />
      <div className="nc-hero-scrim" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[19rem] max-w-2xl flex-col justify-end gap-4 px-6 py-8 sm:min-h-[22rem] sm:px-10 sm:py-10">
        <h1>
          <span className="nc-eyebrow !text-gold">Chào mừng đến {data.appName}</span>
          <span lang="ja" className="nc-display-ja mt-3 block text-[2rem] leading-[1.25] text-white sm:text-[2.75rem]"><span className="inline-block">日本語を、</span><span className="inline-block">もっと楽しく。</span></span>
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">{data.tagline}</p>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href={cta.href} size="lg" variant="accent">
            {cta.label}
            <Icon name="zap" size={18} />
          </ButtonLink>
          {data.enabledNav.includes("review") ? (
            <ButtonLink href="/review" size="lg" variant="outline" className="!border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
              Ôn tập
            </ButtonLink>
          ) : null}
          <span className="basis-full text-xs text-white/75 sm:basis-auto sm:max-w-xs sm:truncate" title={cta.hint}>{cta.hint}</span>
        </div>
      </div>
      {notice ? <div className="relative z-10 bg-black/25 px-6 py-2 text-xs text-white/85 sm:px-10">{notice}</div> : null}
    </section>
  );
}

export function Dashboard({ data, notice }: { data: DashboardData; notice?: React.ReactNode }) {
  const progress = useProgress();
  if (!progress) {
    return (
      <div className="space-y-[var(--gap)]">
        <Hero data={data} progress={null} notice={notice} />
        <div role="status" aria-label="Đang tải tiến độ" className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }
  const today = todayString();
  const labels = Object.fromEntries(dashboardSectionDefs.map((d) => [d.id, d]));
  const isNew = Object.keys(progress.days).length === 0 && progress.quizzes.length === 0;
  const on = (id: string) => data.sections.some((s) => s.id === id && s.enabled);

  const primaryRender: Record<string, () => React.ReactNode> = {
    "next-lesson": () => <NextLesson p={progress} data={data} />,
    "review-due": () => <ReviewDue p={progress} today={today} reviewEnabled={data.enabledNav.includes("review")} />,
    "quick-games": () => <QuickGames data={data} />,
  };
  const secondaryRender: Record<string, () => React.ReactNode> = {
    "jlpt-progress": () => <JlptProgress p={progress} data={data} />,
    "vocab-stats": () => <VocabStats p={progress} today={today} />,
    "last-score": () => <LastScore p={progress} />,
    continue: () => <Continue p={progress} data={data} />,
  };
  const ICON: Record<string, string> = { "next-lesson": "book", "review-due": "repeat", "quick-games": "gamepad", "jlpt-progress": "graduation", "vocab-stats": "brain", "last-score": "trophy", continue: "history" };
  const zone = (render: Record<string, () => React.ReactNode>) => data.sections.filter((s) => s.enabled && render[s.id]);
  const primary = zone(primaryRender);
  const secondary = zone(secondaryRender);
  const anyShown = on("goals") || on("streak") || primary.length > 0 || secondary.length > 0;

  return (
    <div className="space-y-[var(--gap)]">
      <Hero data={data} progress={progress} notice={notice} />
      {isNew ? (
        <Card className="nc-rise border-l-4 !border-l-gold" style={{ "--i": 1 } as React.CSSProperties}>
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

      {on("goals") || on("streak") ? <StatRow p={progress} today={today} goals={on("goals")} streak={on("streak")} /> : null}

      {primary.length > 0 ? (
        <div className="grid gap-[var(--gap)] md:grid-cols-2 lg:grid-cols-3">
          {primary.map((s, i) => (
            <SectionCard key={s.id} id={s.id} title={labels[s.id]?.label ?? s.id} icon={ICON[s.id]} className="nc-rise" >
              <div style={{ "--i": i + 2 } as React.CSSProperties} className="contents">{primaryRender[s.id]()}</div>
            </SectionCard>
          ))}
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <div className="grid gap-[var(--gap)] md:grid-cols-2 lg:grid-cols-3">
          {secondary.map((s) => (
            <SectionCard key={s.id} id={s.id} title={labels[s.id]?.label ?? s.id} icon={ICON[s.id]} className={s.id === "jlpt-progress" ? "md:col-span-2" : undefined}>
              {secondaryRender[s.id]()}
            </SectionCard>
          ))}
        </div>
      ) : null}
      {!anyShown ? <p className="text-sm text-muted-foreground">Quản trị viên đã tắt tất cả các khối trên trang tổng quan.</p> : null}
    </div>
  );
}

function StatRow({ p, today, goals, streak }: { p: Progress; today: string; goals: boolean; streak: boolean }) {
  const d = p.days[today] ?? { minutes: 0, xp: 0, reviews: 0 };
  const s = computeStreak(studyDaysOf(p), today, 1);
  const overall = (Math.min(1, d.minutes / Math.max(1, p.goals.minutes)) + Math.min(1, d.xp / Math.max(1, p.goals.xp))) / 2;
  return (
    <section aria-label="Hôm nay của bạn" className="space-y-2">
      <div className="grid grid-cols-2 gap-[var(--gap)] lg:grid-cols-4">
        {goals ? (
          <>
            <StatTile label="Mục tiêu hôm nay" icon="target" className="nc-rise">
              <div className="flex items-center gap-3">
                <Ring value={overall} label={`Hoàn thành ${Math.round(overall * 100)}% mục tiêu hôm nay`} />
                <p className="text-xs leading-snug text-muted-foreground">{overall >= 1 ? "Đã đạt mục tiêu ngày — giỏi lắm!" : "Gồm phút học và XP."}</p>
              </div>
            </StatTile>
            <StatTile label="Thời gian học" icon="clock" className="nc-rise [--i:1]">
              <p className="text-2xl font-bold tabular-nums">{Math.round(d.minutes)}<span className="text-sm font-medium text-muted-foreground"> / {p.goals.minutes} phút</span></p>
              <Bar value={d.minutes} max={p.goals.minutes} label="Phút học hôm nay" tone="primary" />
            </StatTile>
            <StatTile label="Điểm XP" icon="sparkles" className="nc-rise [--i:2]">
              <p className="text-2xl font-bold tabular-nums">{d.xp}<span className="text-sm font-medium text-muted-foreground"> / {p.goals.xp} XP</span></p>
              <Bar value={d.xp} max={p.goals.xp} label="XP hôm nay" tone="gold" />
            </StatTile>
          </>
        ) : null}
        {streak ? (
          <StatTile label="Chuỗi ngày học" icon="flame" className={cn("nc-rise [--i:3]", !goals && "col-span-2 lg:col-span-1")}>
            <p className="flex items-baseline gap-1.5 text-2xl font-bold tabular-nums">
              {s.current}<span className="text-sm font-medium text-muted-foreground">ngày liên tiếp</span>
            </p>
            <p className="text-xs leading-snug text-muted-foreground">
              {s.current === 0
                ? "Học một chút hôm nay để bắt đầu chuỗi mới."
                : s.studiedToday
                  ? "Hôm nay bạn đã học rồi. Giữ nhịp nhé!"
                  : s.usingRestDay
                    ? "Hôm qua bạn nghỉ — học hôm nay để giữ chuỗi."
                    : "Hôm nay chưa học — vẫn còn kịp."}
              {" "}Dài nhất: {s.longest} ngày.
            </p>
          </StatTile>
        ) : null}
      </div>
      {goals ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Đổi mục tiêu ngày</summary>
          <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
            <label className="text-xs">
              Phút/ngày
              <Select value={p.goals.minutes} onChange={(e) => progressStore.update((x) => setGoals(x, { ...x.goals, minutes: Number(e.target.value) }))}>
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
      ) : null}
    </section>
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
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="primary">{l.level}</Badge>
        <Badge>{data.moduleLabels[l.module] ?? l.module}</Badge>
        <span className="text-xs text-muted-foreground">~{l.est} phút</span>
      </div>
      <p className="mt-3 text-lg font-semibold leading-snug">{l.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Gợi ý theo thứ tự bài và việc bạn đã hoàn thành — không phải đánh giá trình độ.</p>
      <div className="mt-auto pt-4">
        <ButtonLink href={`/lessons/${l.id}`} size="sm">{started ? "Tiếp tục bài" : "Bắt đầu bài"}</ButtonLink>
      </div>
    </div>
  );
}

function ReviewDue({ p, today, reviewEnabled }: { p: Progress; today: string; reviewEnabled: boolean }) {
  const due = Object.values(p.srs).filter((s) => isDue(s, today)).length;
  const wrong = Object.values(p.wrong).filter((w) => !w.resolved).length;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold tabular-nums leading-none text-accent-text">{due}</span>
        <span className="text-sm text-muted-foreground">mục đến hạn ôn</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{wrong} câu hỏi sai chưa khắc phục.</p>
      {reviewEnabled ? (
        <div className="mt-auto pt-4">
          <ButtonLink href="/review" size="sm" variant={due > 0 ? "accent" : "outline"}>
            {due > 0 ? "Ôn ngay" : "Mở trang ôn tập"}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function JlptProgress({ p, data }: { p: Progress; data: DashboardData }) {
  const levels = useItemLevels();
  const seenBy: Record<string, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  const ready = levels !== null && levels !== "error";
  if (ready) for (const key of Object.keys(p.seen)) {
    const l = p.seen[key] ? levels.get(key) : undefined;
    if (l) seenBy[l]++;
  }
  return (
    <div>
      <ul className="space-y-3">
        {LEVELS.map((l) => {
          const total = data.levelTotals[l] ?? 0;
          const seen = seenBy[l];
          const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
          return (
            <li key={l}>
              <Link href={`/jlpt/${l}`} className="nc-lift group grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-lg px-1 py-0.5 -mx-1">
                <span className="nc-display-ja text-xl font-bold text-primary group-hover:underline">{l}</span>
                <Bar value={seen} max={Math.max(total, 1)} label={`Tiến độ ${l}`} tone={pct >= 100 ? "success" : "primary"} />
                <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
                  {ready ? (<><strong className="text-foreground">{pct}%</strong> · {seen}/{total}</>) : levels === "error" ? "—" : "…"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
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
          <Link href={`/lessons/${l.id}`} className="nc-lift flex items-center justify-between gap-2 rounded-lg border border-border-soft px-3 py-2 text-sm hover:bg-muted">
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
    <div>
      <Link href="/games" className="group relative mb-3 block aspect-[16/7] overflow-hidden rounded-lg">
        <JapanScene scene="quest" decorative sizes="(max-width: 1024px) 100vw, 33vw" className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
        <span className="absolute inset-0 bg-gradient-to-t from-[rgb(20_27_54/0.88)] via-[rgb(20_27_54/0.25)] to-transparent" aria-hidden />
        <span className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
          <span className="text-sm font-semibold">Kanji Quest</span>
          <Ja text="漢字探検" className="text-xs text-white/85" />
        </span>
      </Link>
      <ul className="grid gap-1.5">
        {data.games.slice(0, 4).map((g) => (
          <li key={g.id}>
            <Link href={`/games/${g.id}`} className="nc-lift flex items-center gap-3 rounded-lg border border-border-soft px-3 py-2 hover:bg-muted">
              <Icon name={g.icon} size={16} className="text-gold-strong" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.title}</span>
              <Ja text={g.titleJa} className="text-xs text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
