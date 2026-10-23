import { ensureModule, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { ProgressView, type QuestionInfo } from "@/components/progress/progress-view";

export const metadata = { title: "Tiến độ" };

export default async function ProgressPage() {
  await ensureModule("progress");
  const qs = await getVisible("questions");
  const info: Record<string, QuestionInfo> = {};
  for (const q of qs) info[q.id] = { stem: q.stem, level: q.level, skill: q.skill };
  return (
    <>
      <PageHeader title="Tiến độ học" titleJa="進捗" description="Tổng quan, lịch sử bài làm, câu sai, huy hiệu và sao lưu dữ liệu." />
      <ProgressView questions={info} />
    </>
  );
}
