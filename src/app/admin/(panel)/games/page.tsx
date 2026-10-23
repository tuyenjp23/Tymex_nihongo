import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { getGamesSettings } from "@/lib/settings";
import { getImagesMap, getVisible } from "@/lib/content";
import { gameModeDefs } from "@/config/games";
import { topicLabel } from "@/config/topics";
import { PageHeader } from "@/components/ui/card";
import { GamesEditor, type GamesAdminData } from "@/components/admin/games-editor";

export const metadata = { title: "Kanji Quest" };

export default async function GamesAdminPage() {
  await requireAdmin();
  const store = await getStore();
  const [settings, history, vocab, kanji, images] = await Promise.all([getGamesSettings(), store.settingHistory("games"), getVisible("vocabulary"), getVisible("kanji"), getImagesMap()]);

  const inLevels = <T extends { level: string }>(l: T[]) => l.filter((x) => settings.levels.includes(x.level as never));
  const v = inLevels(vocab);
  const k = inLevels(kanji);
  const withPic = v.filter((x) => x.imageable && x.image_id && images.has(x.image_id)).length;
  const all = v.length + k.length;
  const ready: Record<string, number> = {};
  const readyNote: Record<string, string> = {};
  for (const m of gameModeDefs) {
    ready[m.id] = m.needsImage ? withPic : all;
    readyNote[m.id] = m.needsImage ? "từ cụ thể có hình minh họa" : "từ vựng + Kanji trong các cấp đang bật";
  }
  const counts = new Map<string, number>();
  for (const x of vocab) counts.set(x.topic, (counts.get(x.topic) ?? 0) + 1);
  const topics = [...counts].sort((a, b) => a[0].localeCompare(b[0])).map(([id, count]) => ({ id, label: topicLabel(id), count }));

  const data: GamesAdminData = {
    settings,
    history: history.map((h) => ({ version: h.version, saved_at: h.saved_at, saved_by: h.saved_by })),
    topics,
    ready,
    readyNote,
  };
  return (
    <>
      <PageHeader title="Kanji Quest" description="Chọn chế độ chơi, cấp độ, chủ đề và số câu. Muốn thêm hình cho Picture to Kanji: vào Hình minh họa → thêm ảnh → gán cho từ cụ thể." />
      <GamesEditor key={history[0]?.version ?? 0} data={data} />
    </>
  );
}
