import { notFound } from "next/navigation";
import { kanjiLine, meaningText } from "@/lib/vocab-meaning";
import Link from "next/link";
import { ensureModule, getSourcesMap, getVisible, getVisibleById } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Badge, LevelBadge } from "@/components/ui/badge";
import { Ja } from "@/components/ja";
import { Provenance } from "@/components/content/provenance";
import { BackLink, Section } from "@/components/content/bits";
import { RichText } from "@/components/content/rich-text";
import { MarkLessonStarted } from "@/components/content/mark-seen";
import { LessonComplete } from "@/components/content/lesson-complete";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await getVisibleById("lessons", id);
  return { title: l ? l.title : "Bài học" };
}

const MODULE_LABELS: Record<string, string> = {
  vocabulary: "Từ vựng", kanji: "Kanji", grammar: "Ngữ pháp", reading: "Đọc hiểu", listening: "Nghe", conversation: "Giao tiếp",
};

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureModule("jlpt");
  const { id } = await params;
  const lesson = await getVisibleById("lessons", id);
  if (!lesson) notFound();
  const [sources, vocab, kanji, grammar, conv, passages, lessons] = await Promise.all([
    getSourcesMap(),
    getVisible("vocabulary"),
    getVisible("kanji"),
    getVisible("grammar"),
    getVisible("conversations"),
    getVisible("passages"),
    getVisible("lessons"),
  ]);
  const vMap = new Map(vocab.map((x) => [x.id, x]));
  const kMap = new Map(kanji.map((x) => [x.id, x]));
  const gMap = new Map(grammar.map((x) => [x.id, x]));
  const cMap = new Map(conv.map((x) => [x.id, x]));
  const pMap = new Map(passages.map((x) => [x.id, x]));

  const refs = lesson.item_refs
    .map((r) => {
      if (r.type === "vocabulary") { const x = vMap.get(r.id); return x ? { key: r.id, href: `/vocabulary/${x.id}`, ja: x.word === x.reading ? x.word : `{${x.word}|${x.reading}}`, vi: meaningText(x), type: "Từ vựng" } : null; }
      if (r.type === "kanji") { const x = kMap.get(r.id); return x ? { key: r.id, href: `/kanji/${x.id}`, ja: x.char, vi: kanjiLine(x), type: "Kanji" } : null; }
      if (r.type === "grammar") { const x = gMap.get(r.id); return x ? { key: r.id, href: `/grammar/${x.id}`, ja: x.title, vi: x.meaning_vi, type: "Ngữ pháp" } : null; }
      if (r.type === "conversation") { const x = cMap.get(r.id); return x ? { key: r.id, href: `/conversation/${x.id}`, ja: x.title, vi: x.goal, type: "Hội thoại" } : null; }
      const x = pMap.get(r.id);
      return x ? { key: r.id, href: `/quiz?level=${x.level}&skill=${x.kind}&kind=practice`, ja: x.title, vi: x.kind === "reading" ? "Bài đọc — luyện câu hỏi đọc hiểu" : "Bài nghe — luyện câu hỏi nghe", type: x.kind === "reading" ? "Đọc hiểu" : "Nghe" } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const sameLevel = lessons.filter((l) => l.level === lesson.level).sort((a, b) => a.order - b.order);
  const idx = sameLevel.findIndex((l) => l.id === lesson.id);
  const next = idx >= 0 ? sameLevel[idx + 1] : undefined;

  return (
    <>
      <MarkLessonStarted lessonId={lesson.id} />
      <BackLink href={`/jlpt/${lesson.level}`}>Cấp {lesson.level}</BackLink>
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><LevelBadge level={lesson.level} /><Badge>{MODULE_LABELS[lesson.module] ?? lesson.module}</Badge><span>~{lesson.est_minutes} phút</span></span>}
        title={lesson.title}
        description={lesson.summary}
      />
      <div className="space-y-[var(--gap)]">
        <Section title="Nội dung bài" id="body">
          <RichText text={lesson.body} />
        </Section>
        {refs.length > 0 ? (
          <Section title={`Học liệu trong bài (${refs.length})`} id="refs">
            <ul className="grid gap-2 sm:grid-cols-2">
              {refs.map((r) => (
                <li key={r.type + r.key}>
                  <Link href={r.href} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-muted">
                    <Ja text={r.ja} className="text-lg" />
                    <span className="min-w-0 text-sm text-muted-foreground"><span className="block truncate">{r.vi}</span></span>
                    <Badge className="ml-auto shrink-0">{r.type}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LessonComplete lessonId={lesson.id} estMinutes={lesson.est_minutes} />
          {next ? <Link href={`/lessons/${next.id}`} className="text-sm text-primary underline">Bài tiếp: {next.title}</Link> : null}
        </div>
        <Provenance record={lesson} sources={sources} />
      </div>
    </>
  );
}
