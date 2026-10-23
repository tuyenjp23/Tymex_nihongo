import { ensureModule, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Explorer, type ExplorerRow } from "@/components/content/explorer";
import { buildSearchIndex } from "@/lib/search";
import { CONVERSATION_CATEGORY_LABELS } from "@/lib/types";
import { POLITENESS_LABELS } from "@/lib/schemas";

export const metadata = { title: "Giao tiếp thực tế" };

export default async function ConversationPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const initialLevel = ["N5", "N4", "N3", "N2", "N1"].includes(level ?? "") ? (level as string) : "";
  await ensureModule("conversation");
  const items = await getVisible("conversations");
  const rows: ExplorerRow[] = items.map((c) => ({
    id: c.id,
    href: `/conversation/${c.id}`,
    level: c.level_hint,
    group: c.category,
    title: c.title,
    subtitle: c.goal,
    meta: CONVERSATION_CATEGORY_LABELS[c.category],
    status: c.status,
    index: buildSearchIndex([c.title, c.context, c.goal, CONVERSATION_CATEGORY_LABELS[c.category], POLITENESS_LABELS[c.politeness], ...c.lines.flatMap((l) => [l.ja, l.vi]), ...c.tags]),
  }));
  const groups = [...new Set(items.map((c) => c.category))].map((c) => ({ value: c, label: CONVERSATION_CATEGORY_LABELS[c] }));
  return (
    <>
      <PageHeader
        title="Giao tiếp thực tế"
        description="Hội thoại theo tình huống đời sống và công việc: nghe, đọc, nhập vai, luyện phản xạ. Cấp độ là độ khó ngôn ngữ gợi ý."
      />
      <Explorer initialLevel={initialLevel} rows={rows} groupLabel="Tình huống" groups={groups} searchPlaceholder="Tìm tình huống, câu nói, tiếng Việt…" />
    </>
  );
}
