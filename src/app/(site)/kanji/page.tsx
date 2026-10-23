import { ensureModule, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Explorer, type ExplorerRow } from "@/components/content/explorer";
import { LevelNote } from "@/components/content/bits";
import { buildSearchIndex, withRomaji } from "@/lib/search";
import { itemKey } from "@/lib/progress/model";
import { meaningText, searchEnglish } from "@/lib/vocab-meaning";

export const metadata = { title: "Kanji" };

export default async function KanjiPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const initialLevel = ["N5", "N4", "N3", "N2", "N1"].includes(level ?? "") ? (level as string) : "";
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
    index: buildSearchIndex([
      k.char, k.han_viet, k.meaning_vi, searchEnglish(k), ...k.onyomi, ...k.kunyomi,
      ...k.onyomi.map(withRomaji), ...k.kunyomi.map(withRomaji),
      ...k.compounds.flatMap((c) => [c.word, c.reading, c.meaning_vi]),
    ]),
  }));
  return (
    <>
      <PageHeader title="Kanji" description="Âm Hán Việt, nghĩa, cách đọc On/Kun, từ ghép và ví dụ. Gõ Kanji, kana, romaji hoặc âm Hán Việt để tìm." />
      <LevelNote />
      <Explorer initialLevel={initialLevel} rows={rows} searchPlaceholder="Tìm Kanji, âm Hán Việt, cách đọc, nghĩa…" />
    </>
  );
}
