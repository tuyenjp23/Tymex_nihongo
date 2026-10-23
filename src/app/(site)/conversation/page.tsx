import { ensureModule, getVisible } from "@/lib/content";
import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { SceneBanner } from "@/components/art/scene-banner";
import type { SceneId } from "@/config/japan-photos";
import { cn } from "@/lib/utils";
import { Explorer, type ExplorerRow } from "@/components/content/explorer";
import { buildSearchIndex } from "@/lib/search";
import { CONVERSATION_CATEGORY_LABELS } from "@/lib/types";
import { POLITENESS_LABELS } from "@/lib/schemas";

export const metadata = { title: "Giao tiếp thực tế" };

/** Năm tình huống nổi bật có ảnh; mọi tình huống khác vẫn lọc được bằng ô "Tình huống" bên dưới. */
const TOPICS: { group: string; scene: SceneId; title: string; ja: string }[] = [
  { group: "restaurant", scene: "topic-restaurant", title: "Nhà hàng", ja: "レストラン" },
  { group: "transport-life", scene: "topic-station", title: "Nhà ga & đi lại", ja: "駅・交通" },
  { group: "workplace", scene: "topic-workplace", title: "Công sở", ja: "職場" },
  { group: "shopping", scene: "topic-shopping", title: "Mua sắm", ja: "買い物" },
  { group: "keigo", scene: "topic-keigo", title: "Kính ngữ", ja: "敬語" },
];

export default async function ConversationPage({ searchParams }: { searchParams: Promise<{ level?: string; group?: string }> }) {
  const { level, group: groupParam } = await searchParams;
  const initialLevel = ["N5", "N4", "N3", "N2", "N1"].includes(level ?? "") ? (level as string) : "";
  await ensureModule("conversation");
  const items = await getVisible("conversations");
  const initialGroup = items.some((c) => c.category === groupParam) ? (groupParam as string) : "";
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
        titleJa="会話"
        description="Hội thoại theo tình huống đời sống và công việc: nghe, đọc, nhập vai, luyện phản xạ. Cấp độ là độ khó ngôn ngữ gợi ý."
      />
      <nav aria-label="Chọn nhanh tình huống" className="mb-[var(--gap)]">
        <ul className="grid grid-cols-2 gap-[var(--gap)] md:grid-cols-3 lg:grid-cols-5">
          {TOPICS.map((t) => {
            const n = items.filter((c) => c.category === t.group).length;
            if (n === 0) return null;
            const active = initialGroup === t.group;
            const qs = new URLSearchParams();
            if (initialLevel) qs.set("level", initialLevel);
            if (!active) qs.set("group", t.group);
            return (
              <li key={t.group}>
                <Link
                  href={`/conversation${qs.size ? `?${qs}` : ""}`}
                  aria-current={active ? "true" : undefined}
                  className={cn("nc-lift group block rounded-xl outline-offset-2", active && "ring-2 ring-gold")}
                >
                  <SceneBanner scene={t.scene} className="aspect-[4/3] sm:aspect-[5/4]" sizes="(max-width: 768px) 50vw, 20vw">
                    <span lang="ja" className="nc-display-ja block text-xs text-white/85">{t.ja}</span>
                    <span className="block text-base font-semibold leading-tight">{t.title}</span>
                    <span className="block text-xs text-white/85">{n} hội thoại{active ? " · đang lọc (bấm để bỏ)" : ""}</span>
                  </SceneBanner>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Explorer key={`${initialGroup}|${initialLevel}`} initialLevel={initialLevel} initialGroup={initialGroup} rows={rows} groupLabel="Tình huống" groups={groups} searchPlaceholder="Tìm tình huống, câu nói, tiếng Việt…" />
    </>
  );
}
