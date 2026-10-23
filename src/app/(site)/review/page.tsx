import { ensureModule, getImagesMap, getVisible } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { ReviewSession } from "@/components/review/review-session";
import { itemKey } from "@/lib/progress/model";
import { rubyToReading } from "@/lib/furigana";
import type { ReviewItem } from "@/lib/review";
import { MACHINE_VI_NOTE, isMachineVietnamese, kanjiLine, withVietnamese } from "@/lib/vocab-meaning";

export const metadata = { title: "Ôn tập" };

export default async function ReviewPage() {
  await ensureModule("review");
  const [vocab, kanji, grammar, images] = await Promise.all([getVisible("vocabulary"), getVisible("kanji"), getVisible("grammar"), getImagesMap()]);
  const items: ReviewItem[] = [
    ...withVietnamese(vocab).map((v): ReviewItem => {
      const img = v.image_id ? images.get(v.image_id) : undefined;
      return { key: itemKey("vocabulary", v.id), type: "vocabulary", level: v.level, front: v.word, reading: v.reading, back: v.meaning_vi, detail: [v.examples[0] ? `${v.examples[0].ja.replace(/\{([^|}]+)\|[^}]*\}/g, "$1")} — ${v.examples[0].vi}` : "", isMachineVietnamese(v) ? MACHINE_VI_NOTE : ""].filter(Boolean).join(" · ") || undefined, imageUrl: img?.path, imageAlt: img?.alt_vi, href: `/vocabulary/${v.id}` };
    }),
    ...withVietnamese(kanji).map((k): ReviewItem => ({ key: itemKey("kanji", k.id), type: "kanji", level: k.level, front: k.char, reading: [...k.onyomi, ...k.kunyomi].join("、"), back: kanjiLine(k), detail: isMachineVietnamese(k) ? MACHINE_VI_NOTE : undefined, href: `/kanji/${k.id}` })),
    ...grammar.map((g): ReviewItem => ({ key: itemKey("grammar", g.id), type: "grammar", level: g.level, front: g.title, reading: rubyToReading(g.structure), back: g.meaning_vi, detail: g.formation || undefined, href: `/grammar/${g.id}` })),
  ];
  return (
    <>
      <PageHeader title="Ôn tập" titleJa="復習" description="Flashcard ôn theo lịch lặp lại ngắt quãng (SM-2): ôn đúng lúc sắp quên." />
      <ReviewSession items={items} />
    </>
  );
}
