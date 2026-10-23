import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureModule, getVisible } from "@/lib/content";
import { JLPT_OFFICIAL, SKILL_LABELS, type ExamSkill } from "@/config/jlpt";
import { LEVELS, type Level } from "@/lib/types";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/states";
import { OfficialExam } from "@/components/content/official-exam";
import { BackLink } from "@/components/content/bits";

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  return { title: `JLPT ${level.toUpperCase()}` };
}

const SKILLS: ExamSkill[] = ["vocabulary", "kanji", "grammar", "reading", "listening"];
const QUIZ_SET_KIND_SHORT = { practice: "Luyện tập", test: "Kiểm tra", mock: "Thi thử" } as const;

export default async function LevelPage({ params }: { params: Promise<{ level: string }> }) {
  await ensureModule("jlpt");
  const { level: raw } = await params;
  const level = raw.toUpperCase() as Level;
  if (!LEVELS.includes(level)) notFound();
  const [questions, lessons, quizSets] = await Promise.all([getVisible("questions"), getVisible("lessons"), getVisible("quiz_sets")]);
  const visibleQ = new Set(questions.map((q) => q.id));
  const sets = quizSets
    .filter((s) => s.level === level)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map((s) => ({ ...s, available: s.items.filter((i) => visibleQ.has(i.question_id)).length }))
    .filter((s) => s.available > 0);
  const qs = questions.filter((q) => q.level === level);
  const count = (s: ExamSkill) => qs.filter((q) => q.skill === s).length;
  const lv = lessons.filter((l) => l.level === level).sort((a, b) => a.order - b.order);
  const MODULE: Record<string, string> = { vocabulary: "Từ vựng", kanji: "Kanji", grammar: "Ngữ pháp", reading: "Đọc hiểu", listening: "Nghe", conversation: "Giao tiếp" };
  const prev = LEVELS[LEVELS.indexOf(level) - 1];
  const next = LEVELS[LEVELS.indexOf(level) + 1];

  return (
    <>
      <BackLink href="/jlpt">Luyện thi JLPT</BackLink>
      <PageHeader
        title={`JLPT ${level}`}
        description={JLPT_OFFICIAL[level].summaryVi.reading}
        actions={
          <>
            {prev ? <ButtonLink href={`/jlpt/${prev}`} variant="outline" size="sm">← {prev}</ButtonLink> : null}
            {next ? <ButtonLink href={`/jlpt/${next}`} variant="outline" size="sm">{next} →</ButtonLink> : null}
          </>
        }
      />
      <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_24rem]">
        <div className="space-y-[var(--gap)]">
          <Card>
            <CardTitle>Luyện tập theo kỹ năng</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Có phản hồi và giải thích ngay sau mỗi câu.</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {SKILLS.map((s) => (
                <li key={s}>
                  {count(s) > 0 ? (
                    <Link href={`/quiz?level=${level}&skill=${s}&kind=practice`} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 hover:bg-muted">
                      <span className="font-medium">{SKILL_LABELS[s]}</span>
                      <Badge tone="primary">{count(s)} câu</Badge>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-muted-foreground">
                      <span>{SKILL_LABELS[s]}</span>
                      <span className="text-xs">Chưa có câu hỏi</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle>Bài kiểm tra &amp; thi thử</CardTitle>
            {qs.length > 0 ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kiểm tra: không phản hồi trong lúc làm. Thi thử: có đồng hồ đếm ngược rút gọn, kết quả theo phần chấm điểm (tỉ lệ đúng thô).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ButtonLink href={`/quiz?level=${level}&kind=test`}>Làm bài kiểm tra tổng hợp</ButtonLink>
                  <ButtonLink href={`/quiz?level=${level}&kind=mock`} variant="accent">Thi thử có đồng hồ</ButtonLink>
                  <ButtonLink href="/quiz?set=wrong&kind=practice" variant="outline">Làm lại câu sai</ButtonLink>
                </div>
                {qs.length < 20 ? (
                  <Alert tone="info" className="mt-3">Cấp {level} hiện chỉ có {qs.length} câu trong dữ liệu mẫu, nên bài sẽ ngắn hơn đề thật rất nhiều. Quản trị viên có thể thêm câu hỏi tại /admin.</Alert>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Cấp {level} chưa có câu hỏi trong dữ liệu mẫu.</p>
            )}
          </Card>

          {sets.length > 0 ? (
            <Card>
              <CardTitle>Bộ đề soạn sẵn</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Các bộ đề do quản trị viên ghép từ ngân hàng câu hỏi.</p>
              <ul className="mt-3 space-y-2">
                {sets.map((s) => (
                  <li key={s.id}>
                    <Link href={`/quiz?qs=${encodeURIComponent(s.id)}`} className="block rounded-md border border-border px-3 py-2.5 hover:bg-muted">
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{s.title}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Badge>{QUIZ_SET_KIND_SHORT[s.kind]}</Badge>
                          <Badge tone="primary">{s.available} câu</Badge>
                          {s.status !== "verified" && s.status !== "published" ? <Badge tone="warning">Chưa xác minh</Badge> : null}
                        </span>
                      </span>
                      {s.description ? <span className="mt-1 block text-sm text-muted-foreground">{s.description}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <CardTitle>Học liệu cấp {level}</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink href={`/vocabulary?level=${level}`} variant="outline" size="sm">Từ vựng</ButtonLink>
              <ButtonLink href={`/kanji?level=${level}`} variant="outline" size="sm">Kanji</ButtonLink>
              <ButtonLink href={`/grammar?level=${level}`} variant="outline" size="sm">Ngữ pháp</ButtonLink>
              <ButtonLink href={`/conversation?level=${level}`} variant="outline" size="sm">Hội thoại</ButtonLink>
              <ButtonLink href={`/lessons?level=${level}`} variant="outline" size="sm">Tất cả bài học</ButtonLink>
            </div>
            <h3 className="mb-2 mt-4 text-sm font-semibold">Bài học ({lv.length})</h3>
            {lv.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có bài học cho cấp này.</p>
            ) : (
              <ol className="space-y-1.5">
                {lv.map((l) => (
                  <li key={l.id}>
                    <Link href={`/lessons/${l.id}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                      <span className="min-w-0 truncate">{l.title}</span>
                      <span className="flex shrink-0 items-center gap-1.5"><Badge>{MODULE[l.module] ?? l.module}</Badge><span className="text-xs text-muted-foreground">{l.est_minutes}′</span></span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <aside>
          <Card>
            <CardTitle>Cấu trúc kỳ thi chính thức</CardTitle>
            <div className="mt-3"><OfficialExam level={level} /></div>
          </Card>
        </aside>
      </div>
    </>
  );
}
