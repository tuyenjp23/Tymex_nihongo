import { notFound } from "next/navigation";
import { ensureModule, getImagesMap, getVisible } from "@/lib/content";
import { getGamesSettings } from "@/lib/settings";
import { gameModeDefs } from "@/config/games";
import { itemKey } from "@/lib/progress/model";
import { topicLabel } from "@/config/topics";
import { GameRunner } from "@/components/games/game-runner";
import { PageHeader } from "@/components/ui/card";
import { BackLink } from "@/components/content/bits";
import type { GameItem } from "@/lib/games/types";
import { isMachineVietnamese, kanjiLine, withVietnamese } from "@/lib/vocab-meaning";

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const def = gameModeDefs.find((g) => g.id === mode);
  return { title: def ? def.title : "Kanji Quest" };
}

export default async function GameModePage({ params }: { params: Promise<{ mode: string }> }) {
  await ensureModule("games");
  const { mode } = await params;
  const def = gameModeDefs.find((g) => g.id === mode);
  const settings = await getGamesSettings();
  if (!def || def.status !== "available" || !settings.enabledModes.includes(def.id)) notFound();

  const [vocab, kanji, images, questions] = await Promise.all([getVisible("vocabulary"), getVisible("kanji"), getImagesMap(), getVisible("questions")]);
  const items: GameItem[] = [
    // Trò chơi cần đáp án tiếng Việt → bỏ mục chỉ có nghĩa tiếng Anh (vẫn xem được ở Từ vựng/Kanji)
    ...withVietnamese(vocab).map((v): GameItem => {
      const img = v.image_id ? images.get(v.image_id) : undefined;
      return {
        key: itemKey("vocabulary", v.id), type: "vocabulary", level: v.level, topic: v.topic, text: v.word, reading: v.reading, meaning: v.meaning_vi, pos: v.pos, unverifiedMeaning: isMachineVietnamese(v),
        imageUrl: img?.path, imageAlt: img?.alt_vi, imageable: v.imageable, example: v.examples[0],
      };
    }),
    ...withVietnamese(kanji).map((k): GameItem => {
      const img = k.image_id ? images.get(k.image_id) : undefined;
      return {
        key: itemKey("kanji", k.id), type: "kanji", level: k.level, topic: "kanji", text: k.char, reading: [...k.onyomi, ...k.kunyomi].join("、"), meaning: kanjiLine(k), unverifiedMeaning: isMachineVietnamese(k),
        imageUrl: img?.path, imageAlt: img?.alt_vi, imageable: !!img, compounds: k.compounds.map((c) => ({ word: c.word, reading: c.reading, meaning: c.meaning_vi })),
      };
    }),
  ].filter((i) => settings.levels.includes(i.level));
  const topics = [...new Set(items.filter((i) => i.type === "vocabulary").map((i) => i.topic))].sort().map((t) => ({ value: t, label: topicLabel(t) }));
  const questionRefs: Record<string, string> = {};
  for (const q of questions) if ((q.ref_type === "vocabulary" || q.ref_type === "kanji") && q.ref_id) questionRefs[q.id] = itemKey(q.ref_type, q.ref_id);

  return (
    <>
      <BackLink href="/games">Kanji Quest</BackLink>
      <PageHeader title={def.title} eyebrow={def.titleJa} />
      <GameRunner
        mode={{ id: def.id, title: def.title, titleJa: def.titleJa, description: def.description, needsImage: def.needsImage }}
        items={items}
        topics={topics}
        defaults={{ levels: settings.levels, topics: settings.topics, count: settings.questionsPerRound, requireImage: settings.requireImageForPictureGames }}
        questionRefs={questionRefs}
      />
    </>
  );
}
