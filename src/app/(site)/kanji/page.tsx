import { ensureModule, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { ServerExplorer } from "@/components/content/server-explorer";
import type { ExplorerRow } from "@/components/content/explorer-list";
import { LevelNote } from "@/components/content/bits";
import { itemKey } from "@/lib/progress/model";
import { meaningText } from "@/lib/vocab-meaning";
import { kanjiIndex } from "@/lib/memo-index";
import { parseListQuery } from "@/lib/listing";

export const metadata = { title: "Kanji" };

type SP = { q?: string | string[]; level?: string | string[]; page?: string | string[] };

export default async function KanjiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const query = parseListQuery(await searchParams);
  await ensureModule("kanji");
  const items = await getVisible("kanji");
  const rows: ExplorerRow[] = items.map((k) => ({
    id: k.id,
    href: `/kanji/${k.id}`,
    level: k.level,
    big: k.char,
    title: k.han_viet || k.char,
    titleIsJapanese: false,
    subtitle: meaningText(k),
    meta: [k.onyomi[0], k.kunyomi[0]].filter(Boolean).join(" · "),
    status: k.status,
    seenKey: itemKey("kanji", k.id),
    index: kanjiIndex(k),
  }));
  return (
    <>
      <PageHeader title="Kanji" titleJa="漢字" description="Âm Hán Việt, nghĩa, cách đọc On/Kun, từ ghép và ví dụ. Gõ Kanji, kana, romaji hoặc âm Hán Việt để tìm." />
      <LevelNote />
      <ServerExplorer basePath="/kanji" rows={rows} query={query} searchPlaceholder="Tìm Kanji, âm Hán Việt, cách đọc, nghĩa…" />
    </>
  );
}
