import { notFound } from "next/navigation";
import { z } from "zod";
import { ensureModule, getVisible } from "@/lib/content";
import { LEVELS } from "@/lib/types";
import type { QuizPassage, QuizQuestion } from "@/lib/quiz";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PageHeader } from "@/components/ui/card";
import { QUIZ_KIND_LABELS } from "@/lib/quiz";
import { SKILL_LABELS } from "@/config/jlpt";

export const metadata = { title: "Làm bài" };

const ParamsSchema = z.object({
  level: z.enum([...LEVELS, "mixed"]).catch("mixed"),
  skill: z.enum(["vocabulary", "kanji", "grammar", "reading", "listening", "mixed"]).catch("mixed"),
  kind: z.enum(["practice", "test", "mock"]).catch("practice"),
  set: z.enum(["wrong", "all"]).catch("all"),
  /** ID bộ đề do Admin soạn (collection quiz_sets) */
  qs: z.string().max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/).optional().catch(undefined),
});

export default async function QuizPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await ensureModule("jlpt");
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const p = ParamsSchema.parse(flat);
  const wrongMode = p.set === "wrong";

  const [all, passages, quizSets] = await Promise.all([getVisible("questions"), getVisible("passages"), p.qs ? getVisible("quiz_sets") : Promise.resolve([])]);
  const quizSet = p.qs ? quizSets.find((s) => s.id === p.qs) : undefined;
  if (p.qs && !quizSet) notFound();
  let dropped = 0;
  let filtered = all.filter((q) => wrongMode || ((p.level === "mixed" || q.level === p.level) && (p.skill === "mixed" || q.skill === p.skill)));
  if (quizSet) {
    // Giữ đúng thứ tự Admin sắp xếp; bỏ câu không còn hiển thị với người học
    const byId = new Map(all.map((q) => [q.id, q]));
    filtered = quizSet.items.flatMap((it) => {
      const q = byId.get(it.question_id);
      if (!q) dropped++;
      return q ? [q] : [];
    });
  }
  const questions: QuizQuestion[] = filtered.map((q) => ({
    id: q.id, level: q.level, skill: q.skill, topic: q.topic, stem: q.stem, options: q.options,
    correct_option_id: q.correct_option_id, explanation_vi: q.explanation_vi, difficulty: q.difficulty,
    passage_id: q.passage_id, ref_type: q.ref_type, ref_id: q.ref_id, status: q.status,
  }));
  const needed = new Set(questions.map((q) => q.passage_id).filter((x): x is string => !!x));
  const passageMap: Record<string, QuizPassage> = {};
  for (const ps of passages) if (needed.has(ps.id)) passageMap[ps.id] = { id: ps.id, kind: ps.kind, title: ps.title, body: ps.body, body_vi: ps.body_vi, script: ps.script };

  const kind = quizSet ? quizSet.kind : p.kind;
  const level = quizSet ? quizSet.level : p.level;
  const skill = quizSet ? "mixed" : p.skill;
  const backHref = wrongMode ? "/progress" : level === "mixed" ? "/jlpt" : `/jlpt/${level}`;
  const title = quizSet ? quizSet.title : wrongMode ? "Làm lại câu sai" : `${QUIZ_KIND_LABELS[kind]} ${level === "mixed" ? "" : level} ${skill === "mixed" ? "" : `· ${SKILL_LABELS[skill]}`}`.trim();

  return (
    <>
      <PageHeader title={title} />
      <QuizRunner
        questions={questions}
        passages={passageMap}
        kind={kind}
        level={level}
        skill={skill}
        wrongMode={wrongMode}
        backHref={backHref}
        fixedSet={quizSet ? { id: quizSet.id, title: quizSet.title, description: quizSet.description, shuffle: quizSet.shuffle, dropped } : undefined}
      />
    </>
  );
}
