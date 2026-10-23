import { ensureModule } from "@/lib/content";
import { getGamesSettings } from "@/lib/settings";
import { gameModeDefs } from "@/config/games";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { Ja } from "@/components/ja";
import { SceneBanner } from "@/components/art/scene-banner";
import { ButtonLink } from "@/components/ui/button";
import { GameStatsBadge } from "@/components/games/game-stats-badge";

export const metadata = { title: "Kanji Quest" };

export default async function GamesPage() {
  await ensureModule("games");
  const settings = await getGamesSettings();
  return (
    <>
      <SceneBanner scene="quest" className="mb-6 aspect-[16/6] sm:aspect-[16/4.5]" sizes="(max-width: 1280px) 100vw, 1100px" priority>
        <p lang="ja" className="nc-display-ja text-xs tracking-[0.3em] text-white/85">漢字クエスト</p>
        <p className="text-2xl font-bold leading-tight sm:text-3xl">Hành trình khám phá chữ Hán</p>
      </SceneBanner>
      <PageHeader
        title="Kanji Quest"
        titleJa="漢字クエスト"
        description="Học qua trò chơi: nhận diện hình, nghĩa, cách đọc và ôn đúng lúc. Điểm là phần thưởng vui; mức nhớ thật nằm ở lịch ôn."
      />
      <ul className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
        {gameModeDefs.map((g) => {
          const enabled = g.status === "available" && settings.enabledModes.includes(g.id);
          return (
            <li key={g.id}>
              <Card className="nc-lift flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--gold)_20%,var(--card))] text-ink dark:text-gold"><Icon name={g.icon} size={22} /></span>
                  {g.status === "planned" ? <Badge tone="warning">Sắp có</Badge> : !enabled ? <Badge>Đang tắt</Badge> : <GameStatsBadge mode={g.id} />}
                </div>
                <CardTitle as="h2" className="mt-3">{g.title}</CardTitle>
                <Ja text={g.titleJa} className="text-xs text-muted-foreground" as="p" />
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{g.description}</p>
                {enabled ? (
                  <ButtonLink href={`/games/${g.id}`} className="mt-4">Chơi</ButtonLink>
                ) : (
                  <span className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-dashed border-border px-4 text-sm text-muted-foreground">
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
