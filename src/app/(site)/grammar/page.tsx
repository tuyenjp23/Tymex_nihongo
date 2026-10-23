import { ensureModule, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Explorer, type ExplorerRow } from "@/components/content/explorer";
import { LevelNote } from "@/components/content/bits";
import { buildSearchIndex } from "@/lib/search";
import { itemKey } from "@/lib/progress/model";

export const metadata = { title: "Ngữ pháp" };

export default async function GrammarPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const initialLevel = ["N5", "N4", "N3", "N2", "N1"].includes(level ?? "") ? (level as string) : "";
  await ensureModule("grammar");
  const items = await getVisible("grammar");
  const rows: ExplorerRow[] = items.map((g) => ({
    id: g.id,
    href: `/grammar/${g.id}`,
    level: g.level,
    title: g.title,
    subtitle: g.meaning_vi,
    status: g.status,
    seenKey: itemKey("grammar", g.id),
    index: buildSearchIndex([g.title, g.structure, g.meaning_vi, g.usage, ...g.examples.flatMap((e) => [e.ja, e.vi])]),
  }));
  return (
    <>
      <PageHeader title="Ngữ pháp" description="Cấu trúc, cách chia, cách dùng, ví dụ, so sánh với mẫu dễ nhầm và lỗi thường gặp." />
      <LevelNote />
      <Explorer initialLevel={initialLevel} rows={rows} searchPlaceholder="Tìm mẫu câu, nghĩa, ví dụ…" />
    </>
  );
}
