import Link from "next/link";
import { getImagesMap, getVisible } from "@/lib/content";
import { isModuleEnabled } from "@/lib/settings";
import { buildSearchIndex, matchesQuery, withRomaji } from "@/lib/search";
import { PageHeader, Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Ja } from "@/components/ja";
import { CONVERSATION_CATEGORY_LABELS } from "@/lib/types";
import { kanjiLine, meaningText, searchEnglish } from "@/lib/vocab-meaning";

export const metadata = { title: "Tìm kiếm" };
const MAX = 12;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").slice(0, 100).trim();

  let groups: { title: string; items: { href: string; ja?: string; text: string; level: string }[] }[] = [];
  if (q) {
    const [vocabOn, kanjiOn, grammarOn, convOn, jlptOn] = await Promise.all(["vocabulary", "kanji", "grammar", "conversation", "jlpt"].map(isModuleEnabled));
    const [vocab, kanji, grammar, conv, lessons, sentences] = await Promise.all([getVisible("vocabulary"), getVisible("kanji"), getVisible("grammar"), getVisible("conversations"), getVisible("lessons"), getVisible("sentences")]);
    void getImagesMap;
    if (vocabOn)
      groups.push({
        title: "Từ vựng",
        items: vocab
          .filter((v) => matchesQuery(buildSearchIndex([v.word, v.reading, withRomaji(v.reading), v.meaning_vi, searchEnglish(v), ...(v.alt_forms ?? []), ...(v.alt_readings ?? []), v.topic]), q))
          .slice(0, MAX)
          .map((v) => ({ href: `/vocabulary/${v.id}`, ja: v.word === v.reading ? v.word : `{${v.word}|${v.reading}}`, text: meaningText(v), level: v.level })),
      });
    if (kanjiOn)
      groups.push({
        title: "Kanji",
        items: kanji
          .filter((k) => matchesQuery(buildSearchIndex([k.char, k.han_viet, k.meaning_vi, searchEnglish(k), ...k.onyomi, ...k.kunyomi, ...k.onyomi.map(withRomaji), ...k.kunyomi.map(withRomaji), ...k.compounds.flatMap((c) => [c.word, c.reading])]), q))
          .slice(0, MAX)
          .map((k) => ({ href: `/kanji/${k.id}`, ja: k.char, text: kanjiLine(k), level: k.level })),
      });
    if (vocabOn)
      groups.push({
        title: "Câu ví dụ",
        items: sentences
          .filter((s) => matchesQuery(buildSearchIndex([s.ja, ...(s.translations ?? []).map((t) => t.text)]), q))
          .slice(0, MAX)
          .map((s) => {
            const vi = (s.translations ?? []).find((t) => t.lang === "vi");
            const t = vi ?? (s.translations ?? [])[0];
            return { href: `/vocabulary/${(s.word_refs ?? [])[0] ?? ""}`, ja: s.ja, text: t ? `${t.text}${t.kind === "machine_translated" ? " (dịch máy)" : ""}` : "", level: s.level ?? "" };
          })
          .filter((it) => it.href !== "/vocabulary/"),
      });
    if (grammarOn)
      groups.push({
        title: "Ngữ pháp",
        items: grammar
          .filter((g) => matchesQuery(buildSearchIndex([g.title, g.structure, g.meaning_vi, g.usage]), q))
          .slice(0, MAX)
          .map((g) => ({ href: `/grammar/${g.id}`, ja: g.title, text: g.meaning_vi, level: g.level })),
      });
    if (convOn)
      groups.push({
        title: "Hội thoại",
        items: conv
          .filter((c) => matchesQuery(buildSearchIndex([c.title, c.context, c.goal, ...c.lines.flatMap((l) => [l.ja, l.vi])]), q))
          .slice(0, MAX)
          .map((c) => ({ href: `/conversation/${c.id}`, text: `${c.title} — ${CONVERSATION_CATEGORY_LABELS[c.category]}`, level: c.level_hint })),
      });
    if (jlptOn)
      groups.push({
        title: "Bài học",
        items: lessons
          .filter((l) => matchesQuery(buildSearchIndex([l.title, l.summary]), q))
          .slice(0, MAX)
          .map((l) => ({ href: `/lessons/${l.id}`, text: l.title, level: l.level })),
      });
    groups = groups.filter((g) => g.items.length > 0);
  }
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <>
      <PageHeader title="Tìm kiếm" description="Gõ Kanji, kana, romaji hoặc tiếng Việt (có/không dấu)." />
      <form action="/search" role="search" className="mb-[var(--gap)] flex max-w-xl gap-2">
        <label htmlFor="search-page-q" className="sr-only">Từ khóa</label>
        <input id="search-page-q" name="q" type="search" defaultValue={q} placeholder="Ví dụ: yama, núi, 山, ながら…" className="nc-touch h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm" />
        <button type="submit" className="nc-touch h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Tìm</button>
      </form>
      {!q ? (
        <EmptyState title="Nhập từ khóa để tìm" description="Tìm trong từ vựng, Kanji, câu ví dụ, ngữ pháp, hội thoại và bài học cùng lúc." />
      ) : total === 0 ? (
        <EmptyState title={`Không có kết quả cho “${q}”`} description="Thử từ khóa ngắn hơn, đổi giữa romaji / kana / tiếng Việt không dấu." />
      ) : (
        <div className="space-y-[var(--gap)]">
          <p className="text-sm text-muted-foreground">{total} kết quả cho “{q}”</p>
          {groups.map((g) => (
            <Card key={g.title}>
              <CardTitle>{g.title}</CardTitle>
              <ul className="mt-2 divide-y divide-border">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className="flex items-center gap-3 py-2 hover:bg-muted">
                      {it.ja ? <Ja text={it.ja} className="min-w-16 text-lg" /> : null}
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{it.text}</span>
                      {it.level ? <Badge tone="primary">{it.level}</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
