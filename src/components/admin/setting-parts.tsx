"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { RotateCcw } from "@/components/icons";
import { restoreSettingAction, saveSettingAction } from "@/app/admin/actions";
import type { FieldError } from "@/lib/admin/validate";
import { formatDateTimeVi } from "@/lib/dates";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { SettingKey } from "@/lib/settings-schemas";

export interface VersionInfo {
  version: number;
  saved_at: string;
  saved_by: string;
}

/** State + lưu + báo lỗi cho một nhóm cấu hình. Khi server trả phiên bản mới (props đổi), component cha remount bằng `key`. */
export function useSettingEditor<T>(settingKey: SettingKey, initial: T, baseVersion?: number) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = React.useState<T>(initial);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldError[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [conflict, setConflict] = React.useState(false);
  // Phiên bản đang mở; gửi kèm khi lưu để server phát hiện người khác đã lưu trước
  const base = React.useRef<number | undefined>(baseVersion);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = (fn: (v: T) => T) => {
    setValue(fn);
    setDirty(true);
  };
  const replace = (v: T) => {
    setValue(v);
    setDirty(true);
  };
  const save = () =>
    start(async () => {
      const res = await saveSettingAction(settingKey, value, base.current);
      if (res.ok) {
        if (res.version !== undefined) base.current = res.version;
        setConflict(false);
        setDirty(false);
        setErrors([]);
        setWarnings(res.warnings ?? []);
        toast(res.message, "success");
        router.refresh();
      } else {
        setConflict(!!res.conflict);
        setErrors(res.errors ?? [{ path: "", message: res.message }]);
        toast(res.message, "error");
      }
    });
  return { value, update, replace, dirty, errors, warnings, pending, save, conflict };
}

export function SaveBar({ dirty, pending, onSave, onDefaults, errors, warnings, conflict }: { dirty: boolean; pending: boolean; onSave: () => void; onDefaults?: () => void; errors: FieldError[]; warnings?: string[]; conflict?: boolean }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      {errors.length > 0 ? (
        <Alert tone="danger" title="Chưa lưu được">
          <ul className="list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>{e.path ? <code className="text-xs">{e.path}</code> : null} {e.message}</li>
            ))}
          </ul>
          {conflict ? (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => router.refresh()}>
              Tải bản mới nhất (bỏ thay đổi chưa lưu)
            </Button>
          ) : null}
        </Alert>
      ) : null}
      {warnings && warnings.length > 0 ? (
        <Alert tone="warning" title="Đã lưu, nhưng lưu ý độ tương phản">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onSave} disabled={pending || !dirty}>
          {pending ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
        {onDefaults ? (
          <Button type="button" variant="outline" onClick={onDefaults} disabled={pending}>
            Đặt lại về mặc định
          </Button>
        ) : null}
        {dirty ? <span className="text-sm text-warning">Có thay đổi chưa lưu</span> : null}
      </div>
      {onDefaults ? <p className="text-xs text-muted-foreground">&quot;Đặt lại về mặc định&quot; chỉ điền sẵn giá trị mặc định vào form; bạn vẫn cần bấm Lưu. Phiên bản cũ vẫn nằm trong lịch sử.</p> : null}
    </div>
  );
}

export function SettingHistory({ settingKey, history }: { settingKey: SettingKey; history: VersionInfo[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [target, setTarget] = React.useState<VersionInfo | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <Card className="space-y-2">
      <div>
        <CardTitle>Lịch sử phiên bản</CardTitle>
        <CardDescription className="mt-1">Lưu tối đa 25 phiên bản gần nhất. Khôi phục sẽ tạo một phiên bản mới.</CardDescription>
      </div>
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có thay đổi nào — đang dùng giá trị mặc định.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {history.map((h, i) => (
            <li key={h.version} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <strong>v{h.version}</strong> {i === 0 ? <span className="text-xs text-success">(đang dùng)</span> : null}
                <span className="ml-2 text-xs text-muted-foreground">{formatDateTimeVi(h.saved_at)} · {h.saved_by}</span>
              </span>
              {i > 0 ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setTarget(h)}>
                  <RotateCcw size={14} aria-hidden="true" /> Khôi phục
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={target !== null}
        onCancel={() => setTarget(null)}
        busy={pending}
        title={`Khôi phục phiên bản v${target?.version}?`}
        confirmLabel="Khôi phục"
        message={<p>Cấu hình hiện tại sẽ được thay bằng phiên bản này (và vẫn còn trong lịch sử).</p>}
        onConfirm={() =>
          start(async () => {
            if (!target) return;
            const res = await restoreSettingAction(settingKey, target.version);
            setTarget(null);
            toast(res.message, res.ok ? "success" : "error");
            if (res.ok) router.refresh();
          })
        }
      />
    </Card>
  );
}
