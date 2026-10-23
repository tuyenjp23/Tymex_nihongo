import { ensureModule, getImagesMap, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { ServerExplorer } from "@/components/content/server-explorer";
import type { ExplorerRow } from "@/components/content/explorer-list";
import { LevelNote } from "@/components/content/bits";
import { ButtonLink } from "@/components/ui/button";
import { itemKey } from "@/lib/progress/model";
import { topicLabel } from "@/config/topics";
import { meaningText } from "@/lib/vocab-meaning";
import { vocabIndex } from "@/lib/memo-index";
import { parseListQuery } from "@/lib/listing";

export const metadata = { title: "Từ vựng" };

type SP = { q?: string | string[]; level?: string | string[]; group?: string | string[]; page?: string | string[] };

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  await ensureModule("vocabulary");
  const [items, images] = await Promise.all([getVisible("vocabulary"), getImagesMap()]);
  const topics = [...new Set(items.map((v) => v.topic))].sort().map((t) => ({ value: t, label: topicLabel(t) }));
  const query = parseListQuery(sp, topics.map((t) => t.value));
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
      index: vocabIndex(v),
    };
  });
  return (
    <>
      <PageHeader
        title="Từ vựng"
        titleJa="語彙"
        description="Tra cứu và học từ theo chủ đề. Từ cụ thể có hình minh họa; từ trừu tượng không bị gán một hình duy nhất."
        actions={<ButtonLink href="/review" variant="outline">Ôn bằng flashcard</ButtonLink>}
      />
      <LevelNote />
      <ServerExplorer basePath="/vocabulary" rows={rows} query={query} groupLabel="Chủ đề" groups={topics} />
    </>
  );
}
