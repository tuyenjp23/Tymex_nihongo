import Link from "next/link";
import { ensureModule } from "@/lib/content";
import { getGamesSettings } from "@/lib/settings";
import { gameModeDefs } from "@/config/games";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { Ja } from "@/components/ja";
import { GameStatsBadge } from "@/components/games/game-stats-badge";

export const metadata = { title: "Kanji Quest" };

export default async function GamesPage() {
  await ensureModule("games");
  const settings = await getGamesSettings();
  return (
    <>
      <PageHeader
        title="漢字クエスト · Kanji Quest"
        description="Học qua trò chơi: nhận diện hình, nghĩa, cách đọc và ôn đúng lúc. Điểm là phần thưởng vui; mức nhớ thật nằm ở lịch ôn."
      />
      <ul className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
        {gameModeDefs.map((g) => {
          const enabled = g.status === "available" && settings.enabledModes.includes(g.id);
          return (
            <li key={g.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-muted text-primary"><Icon name={g.icon} size={22} /></span>
                  {g.status === "planned" ? <Badge tone="warning">Sắp có</Badge> : !enabled ? <Badge>Đang tắt</Badge> : <GameStatsBadge mode={g.id} />}
                </div>
                <CardTitle as="h2" className="mt-3">{g.title}</CardTitle>
                <Ja text={g.titleJa} className="text-xs text-muted-foreground" as="p" />
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{g.description}</p>
                {enabled ? (
                  <Link href={`/games/${g.id}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Chơi</Link>
                ) : (
                  <span className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">
                    {g.status === "planned" ? "Chưa phát triển" : "Quản trị viên đã tắt"}
                  </span>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
