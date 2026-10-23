import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdmin } from "@/lib/auth/admin";
import { getDataMode } from "@/lib/store/mode";
import { getLocalAuthConfig } from "@/lib/auth/local-session";
import { getTheme } from "@/lib/settings";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { Icon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const check = await checkAdmin();
  if (check.ok) redirect("/admin");
  const mode = getDataMode();
  const theme = await getTheme();
  const notConfigured = mode === "local" && !getLocalAuthConfig();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <div className="text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon name="shield" size={24} />
        </span>
        <h1 className="text-2xl font-bold">Khu quản trị</h1>
        <p className="mt-1 text-sm text-muted-foreground">{theme.appName}</p>
      </div>
      <Card className="space-y-4">
        {sp.error === "not_admin" ? <Alert tone="danger">Tài khoản đã đăng nhập nhưng không có quyền quản trị.</Alert> : null}
        {notConfigured ? (
          <Alert tone="warning" title="Chưa cấu hình mật khẩu admin">
            Chạy <code className="rounded bg-muted px-1">npm run setup</code> để tạo file <code className="rounded bg-muted px-1">.env.local</code> (ADMIN_PASSWORD và SESSION_SECRET), rồi khởi động lại ứng dụng.
          </Alert>
        ) : null}
        <LoginForm mode={mode} next={sp.next ?? "/admin"} />
      </Card>
      <p className="text-center text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          ← Về trang người học
        </Link>
      </p>
    </main>
  );
}
