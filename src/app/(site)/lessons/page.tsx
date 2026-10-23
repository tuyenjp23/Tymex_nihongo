import { ensureModule, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Explorer, type ExplorerRow } from "@/components/content/explorer";
import { buildSearchIndex } from "@/lib/search";

export const metadata = { title: "Bài học" };

const MODULE_LABELS: Record<string, string> = {
  vocabulary: "Từ vựng", kanji: "Kanji", grammar: "Ngữ pháp", reading: "Đọc hiểu", listening: "Nghe", conversation: "Giao tiếp",
};

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const initialLevel = ["N5", "N4", "N3", "N2", "N1"].includes(level ?? "") ? (level as string) : "";
  await ensureModule("jlpt");
  const items = (await getVisible("lessons")).sort((a, b) => a.level.localeCompare(b.level) || a.order - b.order);
  const rows: ExplorerRow[] = items.map((l) => ({
    id: l.id,
    href: `/lessons/${l.id}`,
    level: l.level,
    group: l.module,
    title: l.title,
    titleIsJapanese: false,
    subtitle: l.summary,
    meta: `${MODULE_LABELS[l.module] ?? l.module} · ~${l.est_minutes} phút`,
    status: l.status,
    index: buildSearchIndex([l.title, l.summary, MODULE_LABELS[l.module], ...l.tags]),
  }));
  const groups = [...new Set(items.map((l) => l.module))].map((m) => ({ value: m, label: MODULE_LABELS[m] ?? m }));
  return (
    <>
      <PageHeader title="Bài học" titleJa="レッスン" description="Các bài ngắn có thứ tự, gắn với từ vựng/Kanji/ngữ pháp/hội thoại tương ứng." />
      <Explorer initialLevel={initialLevel} rows={rows} groupLabel="Mô-đun" groups={groups} searchPlaceholder="Tìm bài học…" />
    </>
  );
}
