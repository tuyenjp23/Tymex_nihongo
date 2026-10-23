"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "@/components/icons";

/**
 * Hộp thoại dùng thẻ <dialog> gốc của trình duyệt: có sẵn focus trap, phím Esc và lớp nền (backdrop),
 * nên không cần thư viện ngoài. `open` do component cha điều khiển.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "modal",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "modal" | "drawer";
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn("nc-dialog", variant === "drawer" && "nc-drawer", className)}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // bấm vào nền
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="nc-touch -mr-2 rounded-md p-2 hover:bg-muted">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
      </div>
    </dialog>
  );
}

/** Hộp xác nhận cho thao tác nguy hiểm (xóa, khôi phục...). */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = "Xác nhận",
  danger,
  busy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" onClick={onCancel} className="nc-touch h-10 rounded-md border border-border px-4 text-sm hover:bg-muted">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "nc-touch h-10 rounded-md px-4 text-sm font-medium disabled:opacity-60",
              danger ? "bg-danger text-white" : "bg-primary text-primary-foreground",
            )}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm">{message}</div>
    </Dialog>
  );
}
