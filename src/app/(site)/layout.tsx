import { getContentSettings, getNavigation, getTheme } from "@/lib/settings";
import { AppShell } from "@/components/app-shell";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [nav, theme, content] = await Promise.all([getNavigation(), getTheme(), getContentSettings()]);
  const items = nav.filter((n) => n.enabled).map(({ id, label, href, icon }) => ({ id, label, href, icon }));
  return (
    <AppShell nav={items} brand={{ name: theme.appName, nameJa: theme.appNameJa, logoUrl: theme.logoUrl }} defaultFurigana={content.defaultFurigana}>
      {children}
    </AppShell>
  );
}
