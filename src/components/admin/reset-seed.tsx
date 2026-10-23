"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { resetToSeedAction } from "@/app/admin/actions";
import { COLLECTION_KEYS } from "@/lib/types";
import { COLLECTION_LABELS } from "@/lib/schemas";

export function ResetSeed() {
  const router = useRouter();
  const { toast } = useToast();
  const [target, setTarget] = React.useState<string>("all");
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="reset-target" className="mb-1 block text-xs text-muted-foreground">Phạm vi</label>
          <Select id="reset-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="all">Tất cả nội dung và cấu hình</option>
            {COLLECTION_KEYS.map((c) => (
              <option key={c} value={c}>{COLLECTION_LABELS[c].plural}</option>
            ))}
          </Select>
        </div>
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>Quay về dữ liệu mẫu…</Button>
      </div>
      <ConfirmDialog
        open={open}
        onCancel={() => setOpen(false)}
        busy={pending}
        danger
        title="Quay về dữ liệu mẫu?"
        confirmLabel="Xóa thay đổi và quay về mẫu"
        message={<p>Mọi thay đổi bạn đã thực hiện {target === "all" ? "(nội dung và cấu hình)" : `ở mục ${COLLECTION_LABELS[target as keyof typeof COLLECTION_LABELS]?.plural}`} sẽ bị xóa; ứng dụng dùng lại dữ liệu mẫu ban đầu. Nhật ký vẫn lưu thao tác này, nhưng bạn nên xuất bản sao lưu trước.</p>}
        onConfirm={() =>
          start(async () => {
            const res = await resetToSeedAction(target);
            setOpen(false);
            toast(res.message, res.ok ? "success" : "error");
            if (res.ok) router.refresh();
          })
        }
      />
    </div>
  );
}
