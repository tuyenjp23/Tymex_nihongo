import { ensureModule, getImagesMap, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Explorer, type ExplorerRow } from "@/components/content/explorer";
import { LevelNote } from "@/components/content/bits";
import { ButtonLink } from "@/components/ui/button";
import { buildSearchIndex, withRomaji } from "@/lib/search";
import { itemKey } from "@/lib/progress/model";
import { topicLabel } from "@/config/topics";
import { meaningText, searchEnglish } from "@/lib/vocab-meaning";

export const metadata = { title: "Từ vựng" };

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const initialLevel = ["N5", "N4", "N3", "N2", "N1"].includes(level ?? "") ? (level as string) : "";
  await ensureModule("vocabulary");
  const [items, images] = await Promise.all([getVisible("vocabulary"), getImagesMap()]);
  const rows: ExplorerRow[] = items.map((v) => {
    const img = v.image_id ? images.get(v.image_id) : undefined;
    return {
      id: v.id,
      href: `/vocabulary/${v.id}`,
      level: v.level,
      group: v.topic,
      title: v.word === v.reading ? v.word : `{${v.word}|${v.reading}}`,
      subtitle: meaningText(v),
      meta: topicLabel(v.topic),
      imageUrl: img?.path,
      imageAlt: img?.alt_vi,
      status: v.status,
      seenKey: itemKey("vocabulary", v.id),
      index: buildSearchIndex([v.word, v.reading, withRomaji(v.reading), v.meaning_vi, searchEnglish(v), ...(v.alt_forms ?? []), ...(v.alt_readings ?? []), v.pos, topicLabel(v.topic), ...v.tags]),
    };
  });
  const topics = [...new Set(items.map((v) => v.topic))].sort().map((t) => ({ value: t, label: topicLabel(t) }));
  return (
    <>
      <PageHeader
        title="Từ vựng"
        description="Tra cứu và học từ theo chủ đề. Từ cụ thể có hình minh họa; từ trừu tượng không bị gán một hình duy nhất."
        actions={<ButtonLink href="/review" variant="outline">Ôn bằng flashcard</ButtonLink>}
      />
      <LevelNote />
      <Explorer initialLevel={initialLevel} rows={rows} groupLabel="Chủ đề" groups={topics} />
    </>
  );
}
