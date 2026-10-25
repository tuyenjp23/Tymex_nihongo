import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getContentSettings, getTheme } from "@/lib/settings";
import { themeToCss } from "@/lib/theme";
import { displayInitScript } from "@/lib/display";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/sw-register";

// Theme và menu có thể đổi bất cứ lúc nào trong /admin → không cache tĩnh layout.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getTheme();
  return {
    title: { default: `${theme.appName} — ${theme.appNameJa || "học tiếng Nhật"}`, template: `%s · ${theme.appName}` },
    description: theme.tagline,
    applicationName: theme.appName,
    manifest: "/manifest.webmanifest",
    icons: { icon: theme.faviconUrl ?? "/icons/icon.svg", apple: "/icons/icon-192.png" },
    appleWebApp: { capable: true, title: theme.appName, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#161126" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, content] = await Promise.all([getTheme(), getContentSettings()]);
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* CSS này do themeToCss sinh ra từ cài đặt đã qua Zod (chỉ màu hex/số/enum) — không chứa dữ liệu tự do. */}
        <style id="nc-theme" dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
        <script dangerouslySetInnerHTML={{ __html: displayInitScript(content.defaultFurigana) }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
