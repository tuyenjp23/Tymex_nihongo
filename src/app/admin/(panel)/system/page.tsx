import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { getLocalAuthConfig } from "@/lib/auth/local-session";
import { Card, CardDescription, CardTitle, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { ResetSeed } from "@/components/admin/reset-seed";

export const metadata = { title: "Hệ thống" };

export default async function SystemPage() {
  await requireAdmin();
  const store = await getStore();
  const local = store.mode === "local";
  const cfg = getLocalAuthConfig();
  // Chỉ cho biết đã/ chưa cấu hình — KHÔNG bao giờ in giá trị bí mật
  const rows: [string, string, boolean][] = local
    ? [
        ["Chế độ dữ liệu", "Local — dữ liệu mẫu + file JSON trong thư mục data/", true],
        ["Đăng nhập admin", cfg ? "Mật khẩu từ ADMIN_PASSWORD, cookie ký bằng SESSION_SECRET" : "Chưa cấu hình", !!cfg],
        ["Tiến độ người học", "Lưu trong trình duyệt của từng người (chưa đồng bộ giữa thiết bị)", true],
      ]
    : [
        ["Chế độ dữ liệu", "Supabase — PostgreSQL + Row Level Security", true],
        ["Đăng nhập admin", "Supabase Auth, quyền lấy từ profiles.role = 'admin'", true],
        ["Khóa bí mật phía client", "Chỉ dùng anon key (công khai theo thiết kế). Không có service_role key trong mã client.", true],
      ];
  return (
    <>
      <PageHeader title="Hệ thống" description="Thông tin vận hành và công cụ bảo trì." />
      <Card className="mb-6 space-y-3">
        <CardTitle>Trạng thái</CardTitle>
        <dl className="divide-y divide-border text-sm">
          {rows.map(([k, v, ok]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <dt className="font-medium">{k}</dt>
              <dd className="flex items-center gap-2 text-muted-foreground">
                {v} <Badge tone={ok ? "success" : "danger"}>{ok ? "OK" : "Cần xử lý"}</Badge>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {local ? (
        <>
          <Alert tone="info" title="Lưu ý khi chạy ở chế độ local" className="mb-6">
            Thay đổi được ghi vào thư mục <code>data/</code> trên máy chạy ứng dụng. Môi trường chỉ-đọc (như Vercel) không ghi được — khi triển khai thật hãy dùng Supabase. Nhớ sao lưu thư mục <code>data/</code> hoặc dùng &quot;Nhập / xuất → Sao lưu toàn bộ&quot;.
          </Alert>
          <Card className="space-y-3">
            <div>
              <CardTitle>Quay về dữ liệu mẫu</CardTitle>
              <CardDescription className="mt-1">Xóa các thay đổi của Admin để dùng lại dữ liệu mẫu đi kèm. Không thể hoàn tác (trừ khi bạn đã xuất bản sao lưu).</CardDescription>
            </div>
            <ResetSeed />
          </Card>
        </>
      ) : (
        <Alert tone="info">Ở chế độ Supabase, dữ liệu nằm trong database của bạn; sao lưu và khôi phục thực hiện bằng công cụ của Supabase.</Alert>
      )}
    </>
  );
}
