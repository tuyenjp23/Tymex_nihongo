import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { COLLECTION_KEYS } from "@/lib/types";
import { COLLECTION_LABELS } from "@/lib/schemas";
import { Card, CardDescription, CardTitle, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { ImportPanel } from "@/components/admin/import-panel";
import { RestorePanel } from "@/components/admin/restore-panel";

export const metadata = { title: "Nhập / xuất dữ liệu" };

export default async function ImportExportPage() {
  await requireAdmin();
  const store = await getStore();
  const counts = await Promise.all(COLLECTION_KEYS.map(async (c) => [c, (await store.list(c)).length] as const));
  return (
    <>
      <PageHeader title="Nhập / xuất dữ liệu" description="Sao lưu, chỉnh hàng loạt bằng bảng tính, hoặc nạp nội dung mới. Mọi dòng nhập đều đi qua cùng bộ quy tắc như khi sửa tay." />

      <Card className="mb-6 space-y-3">
        <div>
          <CardTitle>Xuất dữ liệu</CardTitle>
          <CardDescription className="mt-1">CSV có BOM UTF-8 để Excel đọc đúng tiếng Nhật/Việt. Ô có danh sách hoặc đối tượng được ghi dạng JSON.</CardDescription>
        </div>
        <ul className="divide-y divide-border text-sm">
          {counts.map(([c, n]) => (
            <li key={c} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{COLLECTION_LABELS[c].plural} <span className="text-muted-foreground">({n})</span></span>
              <span className="flex gap-2">
                <ButtonLink size="sm" variant="outline" href={`/api/admin/export?collection=${c}&format=json`} prefetch={false}>JSON</ButtonLink>
                <ButtonLink size="sm" variant="outline" href={`/api/admin/export?collection=${c}&format=csv`} prefetch={false}>CSV</ButtonLink>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <ButtonLink href="/api/admin/export?collection=all&format=json" prefetch={false}>Sao lưu toàn bộ (JSON)</ButtonLink>
          <span className="text-xs text-muted-foreground">Gồm mọi loại nội dung và cấu hình hiện tại. Muốn nạp lại cả bản sao lưu: dùng khung "Khôi phục toàn bộ" bên dưới.</span>
        </div>
      </Card>

      <Card className="mb-6 space-y-4">
        <div>
          <CardTitle>Khôi phục toàn bộ từ bản sao lưu</CardTitle>
          <CardDescription className="mt-1">Nạp lại file &quot;Sao lưu toàn bộ (JSON)&quot; (nội dung + cấu hình). Luôn chạy thử trước; chỉ khôi phục được khi không còn lỗi nào. Khôi phục thêm/ghi đè theo ID và không xóa bản ghi tạo sau lúc sao lưu.</CardDescription>
        </div>
        <Alert tone="warning" title="Nên tải bản sao lưu hiện tại trước">
          Khôi phục ghi đè các bản ghi trùng ID. Mọi thay đổi có trong Nhật ký và có thể khôi phục từng bản ghi, nhưng hãy giữ một bản sao lưu hiện tại cho chắc.
        </Alert>
        <RestorePanel />
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>Nhập dữ liệu</CardTitle>
          <CardDescription className="mt-1">Luôn chạy thử trước. Chạy thử không ghi gì và cho biết dòng nào lỗi, vì sao.</CardDescription>
        </div>
        <Alert tone="info" title="Lưu ý về nguồn gốc">
          Nội dung nhập vào vẫn phải có nguồn gốc rõ ràng. Dòng đánh dấu &quot;mẫu chính thức&quot; chỉ hợp lệ khi gắn với nguồn chính thức đã xác nhận quyền sử dụng; trạng thái &quot;đã xác minh&quot; cần người rà soát là người thật và ngày xác minh.
        </Alert>
        <ImportPanel />
      </Card>
    </>
  );
}
