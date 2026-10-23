import { ensureModule, getVisible } from "@/lib/content";
import { getDashboardSections, getGamesSettings, getNavigation } from "@/lib/settings";
import { gameModeDefs } from "@/config/games";
import { itemKey } from "@/lib/progress/model";
import { Dashboard, type DashboardData } from "@/components/dashboard/dashboard";
import { PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { getDataMode } from "@/lib/store/mode";
import { getTheme } from "@/lib/settings";
import Link from "next/link";

export const metadata = { title: "Tổng quan" };

export default async function HomePage() {
  const [theme, sections, games, nav, vocab, kanji, grammar, lessons] = await Promise.all([
    getTheme(),
    getDashboardSections(),
    getGamesSettings(),
    getNavigation(),
    getVisible("vocabulary"),
    getVisible("kanji"),
    getVisible("grammar"),
    getVisible("lessons"),
  ]);
  void ensureModule;
  const itemLevels: DashboardData["itemLevels"] = {};
  for (const v of vocab) itemLevels[itemKey("vocabulary", v.id)] = v.level;
  for (const k of kanji) itemLevels[itemKey("kanji", k.id)] = k.level;
  for (const g of grammar) itemLevels[itemKey("grammar", g.id)] = g.level;

  const data: DashboardData = {
    sections,
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, level: l.level, module: l.module, order: l.order, est: l.est_minutes })),
    itemLevels,
    games: gameModeDefs
      .filter((g) => g.status === "available" && games.enabledModes.includes(g.id))
      .slice(0, 6)
      .map((g) => ({ id: g.id, title: g.title, titleJa: g.titleJa, icon: g.icon })),
    moduleLabels: { vocabulary: "Từ vựng", kanji: "Kanji", grammar: "Ngữ pháp", reading: "Đọc hiểu", listening: "Nghe", conversation: "Giao tiếp" },
    enabledNav: nav.filter((n) => n.enabled).map((n) => n.id),
  };

  return (
    <>
      <PageHeader
        title={`Chào mừng đến ${theme.appName}`}
        description={theme.tagline}
        eyebrow={theme.appNameJa}
      />
      {getDataMode() === "local" ? (
        <Alert tone="info" title="Đang chạy chế độ demo (dữ liệu mẫu)" className="mb-[var(--gap)]">
          Nội dung hiện có do AI soạn làm dữ liệu mẫu và <strong>chưa được giáo viên rà soát</strong>. Không phải đề thi chính thức.{" "}
          <Link href="/sources" className="underline">Xem nguồn và trạng thái xác minh</Link>.
        </Alert>
      ) : null}
      <Dashboard data={data} />
    </>
  );
}
