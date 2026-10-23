import type { Metadata } from "next";
import { getDataMode } from "@/lib/store/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { AuthForms } from "@/components/account/auth-forms";
import { SyncPanel } from "@/components/account/sync-panel";
import { signOutAction } from "./actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tài khoản & đồng bộ" };

export default async function AccountPage() {
  if (getDataMode() !== "supabase") {
    return (
      <>
        <PageHeader title="Tài khoản & đồng bộ" />
        <Alert tone="info" title="Đang ở chế độ demo (local)">
          Tiến độ học được lưu ngay trong trình duyệt này và không đồng bộ giữa các thiết bị. Dùng &quot;Tiến độ → Xuất file&quot; để sao lưu.
          Khi người quản trị kết nối Supabase, bạn có thể đăng nhập để đồng bộ tiến độ giữa điện thoại và máy tính.
        </Alert>
      </>
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return (
    <>
      <PageHeader title="Tài khoản & đồng bộ" description="Đăng nhập để giữ tiến độ học giữa nhiều thiết bị. Không đăng nhập vẫn học bình thường." />
      {data.user ? (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Đã đăng nhập</CardTitle>
              <CardDescription>{data.user.email}</CardDescription>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline">Đăng xuất</Button>
            </form>
          </Card>
          <SyncPanel />
        </div>
      ) : (
        <AuthForms />
      )}
    </>
  );
}
