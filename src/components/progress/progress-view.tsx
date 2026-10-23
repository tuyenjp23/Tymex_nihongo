"use client";
import * as React from "react";
import Link from "next/link";
import { progressStore, useProgress, useProgressStatus } from "@/lib/progress/store";
import { studyDaysOf, unresolvedWrongIds, type Progress } from "@/lib/progress/model";
import { BADGES } from "@/lib/progress/badges";
import { computeStreak } from "@/lib/streak";
import { memoryStage, MEMORY_STAGE_LABELS } from "@/lib/srs";
import { addDays, formatDateVi, todayString } from "@/lib/dates";
import { formatDuration } from "@/lib/utils";
import { SKILL_LABELS, type ExamSkill } from "@/config/jlpt";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/icons";
import { Ja } from "@/components/ja";
import { cn } from "@/lib/utils";

export interface QuestionInfo {
  stem: string;
  level: string;
  skill: string;
}

const KIND = { practice: "Luyện tập", test: "Kiểm tra", mock: "Thi thử" } as const;

export function ProgressView({ questions }: { questions: Record<string, QuestionInfo> }) {
  const p = useProgress();
  const status = useProgressStatus();
  if (!p) {
    return (
      <div role="status" aria-label="Đang tải" className="space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  return (
    <div className="space-y-[var(--gap)]">
      {status.loadError ? (
        <Alert tone="danger" title="Dữ liệu tiến độ cũ bị hỏng nên không đọc được">
          {status.loadError}. Bản gốc đã được sao lưu trong trình duyệt (khóa <code>{status.backupKey}</code>) và app đang dùng tiến độ trống. Bạn có thể{" "}
          <button className="underline" onClick={() => progressStore.clearLoadError()}>ẩn thông báo này</button>.
        </Alert>
      ) : null}
      {status.persistError ? <Alert tone="warning" title="Chưa lưu được tiến độ">{status.persistError}</Alert> : null}
      <Tabs
        tabs={[
          { id: "overview", label: "Tổng quan", content: <Overview p={p} /> },
          { id: "history", label: "Lịch sử bài làm", content: <History p={p} /> },
          { id: "wrong", label: "Câu sai", content: <Wrong p={p} questions={questions} /> },
          { id: "badges", label: "Huy hiệu", content: <Badges p={p} /> },
          { id: "data", label: "Dữ liệu & sao lưu", content: <DataTab p={p} /> },
        ]}
      />
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

function Overview({ p }: { p: Progress }) {
  const today = todayString();
  const streak = computeStreak(studyDaysOf(p), today, 1);
  const totalMin = Object.values(p.days).reduce((s, d) => s + d.minutes, 0);
  const totalReviews = Object.values(p.days).reduce((s, d) => s + d.reviews, 0);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const series = days.map((d) => ({ date: d, minutes: p.days[d]?.minutes ?? 0, xp: p.days[d]?.xp ?? 0 }));
  const max = Math.max(10, ...series.map((s) => s.minutes));
  const stages = { learning: 0, review: 0, mastered: 0 };
  for (const s of Object.values(p.srs)) {
    const st = memoryStage(s);
    if (st !== "new") stages[st]++;
  }
  const stageTotal = stages.learning + stages.review + stages.mastered;

  return (
    <div className="space-y-[var(--gap)]">
      <div className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Tổng XP" value={p.xp} hint="Phần thưởng vui, không ảnh hưởng lịch ôn" />
        <Tile label="Chuỗi hiện tại" value={`${streak.current} ngày`} hint={`Dài nhất: ${streak.longest} ngày`} />
        <Tile label="Tổng thời gian học" value={`${Math.round(totalMin)} phút`} hint="Tính từ thời gian thực làm bài/ôn tập" />
        <Tile label="Tổng lượt ôn" value={totalReviews} hint={`${Object.keys(p.seen).length} mục đã xem`} />
      </div>

      <Card>
        <CardTitle>Thời gian học 14 ngày gần nhất</CardTitle>
        <CardDescription>Phút học mỗi ngày.</CardDescription>
        <svg role="img" aria-label={`Biểu đồ cột số phút học 14 ngày gần nhất. Tổng ${Math.round(series.reduce((s, x) => s + x.minutes, 0))} phút.`} viewBox="0 0 560 160" className="mt-3 h-40 w-full">
          {series.map((s, i) => {
            const h = (s.minutes / max) * 110;
            const x = 12 + i * 39.5;
            return (
              <g key={s.date}>
                <rect x={x} y={125 - h} width={28} height={Math.max(h, s.minutes > 0 ? 2 : 0)} rx={4} fill="var(--primary)" opacity={s.date === today ? 1 : 0.75} />
                <text x={x + 14} y={142} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{s.date.slice(8)}</text>
                {s.minutes > 0 ? <text x={x + 14} y={120 - h} textAnchor="middle" fontSize="10" fill="var(--foreground)">{Math.round(s.minutes)}</text> : null}
              </g>
            );
          })}
          <line x1="8" y1="125" x2="552" y2="125" stroke="var(--border)" />
        </svg>
        <details className="mt-1 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Xem dạng bảng</summary>
          <table className="mt-2 w-full text-left text-xs">
            <thead><tr><th className="py-1">Ngày</th><th>Phút</th><th>XP</th></tr></thead>
            <tbody>{series.map((s) => <tr key={s.date} className="border-t border-border"><td className="py-1">{formatDateVi(s.date)}</td><td>{s.minutes}</td><td>{s.xp}</td></tr>)}</tbody>
          </table>
        </details>
      </Card>

      <Card>
        <CardTitle>Mức ghi nhớ (theo lịch SM-2)</CardTitle>
        {stageTotal === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Chưa có mục nào được ôn. Vào <Link className="underline" href="/review">Ôn tập</Link> hoặc chơi Kanji Quest để bắt đầu.</p>
        ) : (
          <>
            <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Đang học ${stages.learning}, đang củng cố ${stages.review}, thuộc vững ${stages.mastered}`}>
              <div style={{ width: `${(stages.learning / stageTotal) * 100}%`, background: "var(--warning)" }} />
              <div style={{ width: `${(stages.review / stageTotal) * 100}%`, background: "var(--primary)" }} />
              <div style={{ width: `${(stages.mastered / stageTotal) * 100}%`, background: "var(--success)" }} />
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--warning)" }} />{MEMORY_STAGE_LABELS.learning}: {stages.learning}</li>
              <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--primary)" }} />{MEMORY_STAGE_LABELS.review}: {stages.review}</li>
              <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--success)" }} />{MEMORY_STAGE_LABELS.mastered}: {stages.mastered}</li>
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function History({ p }: { p: Progress }) {
  if (p.quizzes.length === 0) {
    return <EmptyState title="Chưa có bài làm nào" description="Làm một bài luyện tập, kiểm tra hoặc thi thử để xem lịch sử tại đây." action={<ButtonLink href="/jlpt">Mở Luyện thi JLPT</ButtonLink>} />;
  }
  return (
    <ul className="space-y-2">
      {p.quizzes.map((q) => (
        <li key={q.id}>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{KIND[q.kind]} · {q.level === "mixed" ? "nhiều cấp" : q.level}{q.skill !== "mixed" ? ` · ${SKILL_LABELS[q.skill as ExamSkill] ?? q.skill}` : ""}</p>
              <p className="text-sm text-muted-foreground">{formatDateVi(q.date)} · {formatDuration(q.durationSec)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">{q.correct}/{q.total}</p>
              <Badge tone={q.percent >= 70 ? "success" : q.percent >= 40 ? "warning" : "danger"}>{Math.round(q.percent)}%</Badge>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function Wrong({ p, questions }: { p: Progress; questions: Record<string, QuestionInfo> }) {
  const ids = unresolvedWrongIds(p);
  const resolved = Object.values(p.wrong).filter((w) => w.resolved).length;
  if (ids.length === 0) {
    return <EmptyState title="Không có câu sai nào cần ôn" description={resolved > 0 ? `Bạn đã khắc phục ${resolved} câu từng sai. Tuyệt!` : "Những câu bạn làm sai sẽ được lưu ở đây."} />;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{ids.length} câu chưa khắc phục · đã khắc phục {resolved}. Trả lời đúng 2 lần liên tiếp là coi như đã khắc phục.</p>
        <ButtonLink href="/quiz?set=wrong&kind=practice">Làm lại các câu sai</ButtonLink>
      </div>
      <ul className="space-y-2">
        {ids.map((id) => {
          const q = questions[id];
          const w = p.wrong[id];
          return (
            <li key={id}>
              <Card className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {q ? <Ja text={q.stem} className="text-lg" as="p" /> : <p className="text-sm text-muted-foreground">Câu hỏi {id} không còn trong dữ liệu</p>}
                  <p className="text-xs text-muted-foreground">{q ? `${q.level} · ${SKILL_LABELS[q.skill as ExamSkill] ?? q.skill} · ` : ""}sai {w.count} lần · gần nhất {formatDateVi(w.last)}</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badges({ p }: { p: Progress }) {
  const got = BADGES.filter((b) => p.badges[b.id]).length;
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Đã nhận {got}/{BADGES.length} huy hiệu. Huy hiệu ghi nhận sự đều đặn và quá trình ôn tập, không so sánh với người khác.</p>
      <ul className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((b) => {
          const date = p.badges[b.id];
          return (
            <li key={b.id}>
              <Card className={cn("flex items-start gap-3", !date && "opacity-60")}>
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", date ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}><Icon name={b.icon} /></span>
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                  <p className="mt-1 text-xs">{date ? `Nhận ngày ${formatDateVi(date)}` : "Chưa đạt"}</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DataTab({ p }: { p: Progress }) {
  const { toast } = useToast();
  const [mode, setMode] = React.useState<"merge" | "replace">("merge");
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmImport, setConfirmImport] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([progressStore.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nihongo-compass-tien-do-${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Đã xuất file sao lưu", "success");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setError("File quá lớn (tối đa 5 MB).");
    setConfirmImport(await f.text());
  }

  function doImport() {
    if (confirmImport === null) return;
    const r = progressStore.importJson(confirmImport, mode);
    setConfirmImport(null);
    if (r.ok) toast(mode === "merge" ? "Đã gộp tiến độ từ file" : "Đã thay tiến độ bằng file", "success");
    else setError(r.error);
  }

  return (
    <div className="grid gap-[var(--gap)] lg:grid-cols-2">
      <Card>
        <CardTitle>Sao lưu &amp; khôi phục</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Tiến độ được lưu trong trình duyệt này. Hãy xuất file để sao lưu hoặc chuyển sang thiết bị khác.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={exportJson}>Xuất file JSON</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Nhập từ file…</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={onFile} aria-label="Chọn file tiến độ JSON" />
        </div>
        <fieldset className="mt-3 text-sm">
          <legend className="mb-1 font-medium">Khi nhập file</legend>
          <label className="mr-4"><input type="radio" name="imp" checked={mode === "merge"} onChange={() => setMode("merge")} className="mr-1.5" />Gộp với tiến độ hiện tại (khuyên dùng)</label>
          <label><input type="radio" name="imp" checked={mode === "replace"} onChange={() => setMode("replace")} className="mr-1.5" />Thay thế hoàn toàn</label>
        </fieldset>
        {error ? <Alert tone="danger" className="mt-3" title="Không nhập được">{error}</Alert> : null}
      </Card>
      <Card>
        <CardTitle>Xóa tiến độ</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Xóa toàn bộ tiến độ trên trình duyệt này (XP, lịch ôn, lịch sử, huy hiệu). Nên xuất file sao lưu trước.</p>
        <Button variant="danger" className="mt-3" onClick={() => setConfirmReset(true)}>Xóa toàn bộ tiến độ</Button>
        <p className="mt-3 text-xs text-muted-foreground">Phiên bản dữ liệu: v{p.v} · tạo ngày {formatDateVi(p.createdAt.slice(0, 10))}.</p>
      </Card>
      <ConfirmDialog open={confirmReset} onCancel={() => setConfirmReset(false)} onConfirm={() => { progressStore.reset(); setConfirmReset(false); toast("Đã xóa tiến độ", "info"); }} title="Xóa toàn bộ tiến độ?" message="Hành động này không thể hoàn tác. Hãy chắc chắn bạn đã xuất file sao lưu nếu cần." confirmLabel="Xóa" danger />
      <ConfirmDialog open={confirmImport !== null} onCancel={() => setConfirmImport(null)} onConfirm={doImport} title={mode === "merge" ? "Gộp tiến độ từ file?" : "Thay thế toàn bộ tiến độ?"} message={mode === "merge" ? "Dữ liệu trong file sẽ được gộp với tiến độ hiện có, không mất dữ liệu nào." : "Tiến độ hiện tại sẽ bị thay bằng nội dung file. Không thể hoàn tác."} confirmLabel="Nhập" danger={mode === "replace"} />
    </div>
  );
}
