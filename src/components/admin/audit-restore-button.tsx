"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { RotateCcw } from "@/components/icons";
import { restoreAuditAction } from "@/app/admin/actions";

export function AuditRestoreButton({ auditId, target, deleted }: { auditId: string; target: string; deleted: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw size={14} aria-hidden="true" /> {deleted ? "Khôi phục bản đã xóa" : "Khôi phục bản trước"}
      </Button>
      <ConfirmDialog
        open={open}
        onCancel={() => setOpen(false)}
        busy={pending}
        title="Khôi phục bản ghi?"
        confirmLabel="Khôi phục"
        message={<p>{deleted ? `Bản ghi ${target} sẽ được tạo lại như trước khi xóa.` : `Bản ghi ${target} sẽ quay về nội dung trước lần sửa này (thay đổi hiện tại bị ghi đè nhưng vẫn nằm trong nhật ký).`}</p>}
        onConfirm={() =>
          start(async () => {
            const res = await restoreAuditAction(auditId);
            setOpen(false);
            toast(res.message, res.ok ? "success" : "error");
            if (res.ok) router.refresh();
          })
        }
      />
    </>
  );
}
