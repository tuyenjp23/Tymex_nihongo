import { ensureModule, getVisible } from "@/lib/content";
import { getDashboardSections, getGamesSettings, getNavigation } from "@/lib/settings";
import { gameModeDefs } from "@/config/games";
import { buildItemLevelGroups, countByLevel } from "@/lib/item-levels";
import { Dashboard, type DashboardData } from "@/components/dashboard/dashboard";
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
  // Chỉ gửi TỔNG theo cấp; bảng "mã → cấp" để đếm đã xem được tải riêng (và cache) qua /api/item-levels.
  const levelTotals = countByLevel(buildItemLevelGroups({ vocabulary: vocab, kanji, grammar }));

  const data: DashboardData = {
    appName: theme.appName,
    tagline: theme.tagline,
    sections,
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, level: l.level, module: l.module, order: l.order, est: l.est_minutes })),
    levelTotals,
    games: gameModeDefs
      .filter((g) => g.status === "available" && games.enabledModes.includes(g.id))
      .slice(0, 6)
      .map((g) => ({ id: g.id, title: g.title, titleJa: g.titleJa, icon: g.icon })),
    moduleLabels: { vocabulary: "Từ vựng", kanji: "Kanji", grammar: "Ngữ pháp", reading: "Đọc hiểu", listening: "Nghe", conversation: "Giao tiếp" },
    enabledNav: nav.filter((n) => n.enabled).map((n) => n.id),
  };

  const notice =
    getDataMode() === "local" ? (
      <>
        Đang chạy chế độ demo (dữ liệu mẫu): nội dung do AI soạn và <strong>chưa được giáo viên rà soát</strong>, không phải đề thi chính thức.{" "}
        <Link href="/sources" className="underline">Xem nguồn và trạng thái xác minh</Link>.
      </>
    ) : null;

  return <Dashboard data={data} notice={notice} />;
}
