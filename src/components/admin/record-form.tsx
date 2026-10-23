"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2 } from "@/components/icons";
import { COLLECTION_GROUPS, type FieldSpec, type Option, type RefKind } from "@/lib/admin/field-specs";
import type { FieldError } from "@/lib/admin/validate";
import type { CollectionKey } from "@/lib/types";
import { COLLECTION_LABELS } from "@/lib/schemas";
import { todayString } from "@/lib/dates";
import { deleteRecordAction, saveRecordAction } from "@/app/admin/actions";
import { ImageUpload } from "./image-upload";
import { cn } from "@/lib/utils";

export type RefOptions = Record<RefKind, Option[]>;
type Rec = Record<string, unknown>;

interface Ctx {
  errors: Map<string, string>;
  refs: RefOptions;
  idBase: string;
  onJsonState: (path: string, bad: boolean) => void;
}

function setIn(obj: unknown, path: (string | number)[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[head as number] = setIn(copy[head as number], rest, value);
    return copy;
  }
  const o = (obj ?? {}) as Rec;
  return { ...o, [head]: setIn(o[head as string], rest, value) };
}

const fullWidth = (s: FieldSpec) => s.kind === "textarea" || s.kind === "list" || s.kind === "json" || s.kind === "strings" || s.kind === "boolean";

/* ───────────── Một ô nhập theo loại trường ───────────── */

function StringsControl({ id, value, onChange, jp, placeholder, describedBy }: { id: string; value: string[]; onChange: (v: string[]) => void; jp?: boolean; placeholder?: string; describedBy?: string }) {
  // Giữ chuỗi thô trong state để gõ Enter/khoảng trắng không bị cắt giữa chừng
  const [text, setText] = React.useState((value ?? []).join("\n"));
  return (
    <Textarea
      id={id}
      lang={jp ? "ja" : undefined}
      value={text}
      rows={Math.max(3, Math.min(10, text.split("\n").length + 1))}
      placeholder={placeholder}
      aria-describedby={describedBy}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

function JsonControl({ id, path, value, rows, onChange, ctx }: { id: string; path: string; value: unknown; rows?: number; onChange: (v: unknown) => void; ctx: Ctx }) {
  const [text, setText] = React.useState(JSON.stringify(value ?? [], null, 2));
  const [err, setErr] = React.useState<string | null>(null);
  return (
    <>
      <Textarea
        id={id}
        className="font-mono text-xs"
        rows={rows ?? 10}
        spellCheck={false}
        value={text}
        aria-invalid={err ? true : undefined}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          try {
            const parsed = JSON.parse(t);
            setErr(null);
            ctx.onJsonState(path, false);
            onChange(parsed);
          } catch (ex) {
            setErr((ex as Error).message);
            ctx.onJsonState(path, true);
          }
        }}
      />
      {err ? <p role="alert" className="mt-1 text-xs font-medium text-danger">JSON chưa hợp lệ: {err}</p> : null}
    </>
  );
}

function Control({ spec, value, onChange, path, ctx, extraAfter }: { spec: FieldSpec; value: unknown; onChange: (v: unknown) => void; path: string; ctx: Ctx; extraAfter?: React.ReactNode }) {
  const id = `${ctx.idBase}-${path.replace(/\./g, "-")}`;
  const error = ctx.errors.get(path);
  const describedBy = error ? `${id}-error` : spec.hint ? `${id}-hint` : undefined;
  const common = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy } as const;

  let control: React.ReactNode;
  switch (spec.kind) {
    case "text":
    case "url":
      control = <Input {...common} type={spec.kind === "url" ? "url" : "text"} lang={spec.jp ? "ja" : undefined} placeholder={spec.placeholder} value={(value as string | null) ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "textarea":
      control = <Textarea {...common} lang={spec.jp ? "ja" : undefined} rows={spec.rows ?? 3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "date":
      control = (
        <div className="flex gap-2">
          <Input {...common} type="date" value={(value as string | null) ?? ""} onChange={(e) => onChange(e.target.value)} />
          <Button type="button" variant="outline" onClick={() => onChange(todayString())}>
            Hôm nay
          </Button>
        </div>
      );
      break;
    case "number":
      control = <Input {...common} type="number" inputMode="numeric" min={spec.min} max={spec.max} step={spec.int ? 1 : "any"} value={(value as number | string) ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
      break;
    case "select":
      control = (
        <Select {...common} value={(value as string | null) ?? ""} onChange={(e) => onChange(e.target.value === "" && spec.nullable ? null : e.target.value)}>
          {spec.nullable ? <option value="">— Không —</option> : null}
          {spec.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    case "ref": {
      const options = ctx.refs[spec.ref];
      const cur = (value as string | null) ?? "";
      const dangling = cur !== "" && !options.some((o) => o.value === cur);
      control = (
        <Select {...common} value={cur} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}>
          <option value="">— Không —</option>
          {dangling ? <option value={cur}>{cur} (không tồn tại)</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    }
    case "boolean":
      control = (
        <div className="flex items-center gap-3">
          <Switch id={id} checked={Boolean(value)} onChange={onChange} label={spec.text} />
          <span className="text-sm">{spec.text}</span>
        </div>
      );
      break;
    case "strings":
      control = <StringsControl id={id} value={(value as string[]) ?? []} onChange={onChange} jp={spec.jp} placeholder={spec.placeholder} describedBy={describedBy} />;
      break;
    case "json":
      control = <JsonControl id={id} path={path} value={value} rows={spec.rows} onChange={onChange} ctx={ctx} />;
      break;
    case "list": {
      const items = (Array.isArray(value) ? value : []) as Rec[];
      const min = spec.min ?? 0;
      const move = (i: number, d: number) => {
        const j = i + d;
        if (j < 0 || j >= items.length) return;
        const copy = [...items];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        onChange(copy);
      };
      control = (
        <div className="space-y-3">
          {items.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có mục nào.</p> : null}
          {items.map((item, i) => (
            <fieldset key={i} className="rounded-md border border-border p-3">
              <legend className="px-1 text-xs font-semibold text-muted-foreground">
                {spec.itemLabel} {i + 1}
              </legend>
              <div className="grid gap-3 md:grid-cols-2">
                {spec.fields.map((f) => (
                  <Field key={f.key} label={f.label} htmlFor={`${id}-${i}-${f.key}`} required={f.required} hint={f.hint} error={ctx.errors.get(`${path}.${i}.${f.key}`)} className={cn(fullWidth(f) && "md:col-span-2")}>
                    <Control spec={f} value={item[f.key]} path={`${path}.${i}.${f.key}`} ctx={{ ...ctx, idBase: ctx.idBase }} onChange={(v) => onChange(items.map((it, k) => (k === i ? { ...it, [f.key]: v } : it)))} />
                  </Field>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {spec.orderable ? (
                  <>
                    <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Chuyển ${spec.itemLabel} ${i + 1} lên`}>
                      Lên
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Chuyển ${spec.itemLabel} ${i + 1} xuống`}>
                      Xuống
                    </Button>
                  </>
                ) : null}
                <Button type="button" size="sm" variant="ghost" disabled={items.length <= min} onClick={() => onChange(items.filter((_, k) => k !== i))} aria-label={`Xóa ${spec.itemLabel} ${i + 1}`}>
                  <Trash2 size={14} aria-hidden="true" /> Xóa
                </Button>
              </div>
            </fieldset>
          ))}
          <Button type="button" size="sm" variant="secondary" disabled={items.length >= (spec.max ?? 999)} onClick={() => onChange([...items, { ...spec.blank }])}>
            <Plus size={14} aria-hidden="true" /> Thêm {spec.itemLabel.toLowerCase()}
          </Button>
        </div>
      );
      break;
    }
  }
  return (
    <>
      {control}
      {extraAfter}
    </>
  );
}

/* ───────────── Form ───────────── */

export function RecordForm({
  collection,
  initial,
  isNew,
  refs,
  usages = [],
}: {
  collection: CollectionKey;
  initial: Rec;
  isNew: boolean;
  refs: RefOptions;
  usages?: { collection: string; id: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = React.useState<Rec>(initial);
  const [errors, setErrors] = React.useState<FieldError[]>([]);
  const [pending, startTransition] = React.useTransition();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);
  // updated_at của bản đang mở — gửi kèm khi lưu để server phát hiện người khác đã sửa trước
  const baseUpdatedAt = React.useRef<string | null>(isNew ? null : typeof initial.updated_at === "string" ? initial.updated_at : null);
  const jsonBad = React.useRef(new Set<string>());
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const idBase = React.useId().replace(/:/g, "");
  const groups = COLLECTION_GROUPS[collection];
  const label = COLLECTION_LABELS[collection];

  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const errorMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const e of errors) if (!m.has(e.path)) m.set(e.path, e.message);
    return m;
  }, [errors]);
  const knownPaths = React.useMemo(() => {
    const s = new Set<string>(["id"]);
    const walk = (fields: FieldSpec[], prefix: string) =>
      fields.forEach((f) => {
        s.add(prefix + f.key);
      });
    groups.forEach((g) => walk(g.fields, ""));
    return s;
  }, [groups]);
  // Lỗi không gắn được vào ô nhập cụ thể (vd. lỗi chung, hoặc trong mục lồng nhau) → hiển thị ở khung tóm tắt
  const summary = errors.filter((e) => !knownPaths.has(e.path.split(".")[0]) || e.path.includes(".") || e.path === "");

  const ctx: Ctx = {
    errors: errorMap,
    refs,
    idBase,
    onJsonState: (p, bad) => {
      if (bad) jsonBad.current.add(p);
      else jsonBad.current.delete(p);
    },
  };

  function set(key: string, v: unknown) {
    setValue((cur) => setIn(cur, [key], v) as Rec);
    setDirty(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (jsonBad.current.size > 0) {
      setErrors([{ path: [...jsonBad.current][0], message: "Sửa lỗi JSON trước khi lưu" }]);
      toast("Có ô JSON chưa hợp lệ", "error");
      return;
    }
    startTransition(async () => {
      const res = await saveRecordAction(collection, value, isNew, baseUpdatedAt.current);
      if (res.ok) {
        if (res.updatedAt) baseUpdatedAt.current = res.updatedAt;
        setConflict(false);
        setDirty(false);
        setErrors([]);
        toast(res.message, "success");
        if (isNew) router.replace(`/admin/content/${collection}/${encodeURIComponent(res.id ?? String(value.id))}`);
        router.refresh();
      } else {
        setConflict(!!res.conflict);
        setErrors(res.errors ?? [{ path: "", message: res.message }]);
        toast(res.message, "error");
        requestAnimationFrame(() => summaryRef.current?.focus());
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteRecordAction(collection, String(value.id));
      setConfirmDelete(false);
      if (res.ok) {
        setDirty(false);
        toast(res.message, "success");
        router.replace(`/admin/content/${collection}`);
        router.refresh();
      } else {
        toast(res.message, "error");
        setErrors([{ path: "", message: res.message }]);
        requestAnimationFrame(() => summaryRef.current?.focus());
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6" aria-label={`Biểu mẫu ${label.singular}`}>
      {errors.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Alert tone="danger" title={`Chưa lưu được — ${errors.length} lỗi`}>
            <ul className="list-disc pl-5">
              {(summary.length > 0 ? summary : errors).map((e, i) => (
                <li key={i}>
                  {e.path ? <code className="text-xs">{e.path}</code> : null} {e.message}
                </li>
              ))}
            </ul>
            {conflict ? (
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => { setDirty(false); setErrors([]); setConflict(false); router.refresh(); }}>
                  Tải bản mới nhất (bỏ thay đổi chưa lưu)
                </Button>
                <p className="mt-1 text-xs">Muốn giữ thay đổi của bạn? Sao chép chúng ra chỗ khác trước khi tải lại.</p>
              </div>
            ) : null}
          </Alert>
        </div>
      ) : null}

      {usages.length > 0 ? (
        <Alert tone="info" title={`Đang được ${usages.length} mục khác dùng`}>
          {usages.slice(0, 6).map((u) => `${u.collection}/${u.id}`).join(", ")}
          {usages.length > 6 ? "…" : ""} — vì vậy chưa thể xóa; có thể chọn "Ẩn".
        </Alert>
      ) : null}

      <Card>
        <Field label="ID" htmlFor={`${idBase}-id`} required hint={isNew ? "Chữ, số, - và _. Không đổi được sau khi tạo." : "ID không đổi được."} error={errorMap.get("id")}>
          <Input id={`${idBase}-id`} value={String(value.id ?? "")} readOnly={!isNew} disabled={!isNew} onChange={(e) => set("id", e.target.value)} aria-invalid={errorMap.get("id") ? true : undefined} />
        </Field>
      </Card>

      {groups.map((g) => (
        <Card key={g.id} className="space-y-4" aria-labelledby={`${idBase}-g-${g.id}`}>
          <div>
            <CardTitle id={`${idBase}-g-${g.id}`}>{g.title}</CardTitle>
            {g.description ? <CardDescription className="mt-1">{g.description}</CardDescription> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {g.fields.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`${idBase}-${f.key}`} required={f.required} hint={f.hint} error={f.kind === "list" || f.kind === "json" ? errorMap.get(f.key) : errorMap.get(f.key)} className={cn(fullWidth(f) && "md:col-span-2")}>
                <Control
                  spec={f}
                  value={value[f.key]}
                  path={f.key}
                  ctx={ctx}
                  onChange={(v) => set(f.key, v)}
                  extraAfter={collection === "images" && f.key === "path" ? <ImageUpload onUploaded={(p) => set("path", p)} /> : null}
                />
              </Field>
            ))}
          </div>
        </Card>
      ))}

      <details className="rounded-md border border-border bg-card p-3 text-sm">
        <summary className="cursor-pointer font-medium">Xem JSON của bản ghi (chỉ đọc)</summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
      </details>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Đang lưu…" : isNew ? `Thêm ${label.singular.toLowerCase()}` : "Lưu thay đổi"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/admin/content/${collection}`)} disabled={pending}>
            {dirty ? "Hủy" : "Quay lại"}
          </Button>
        </div>
        {!isNew ? (
          <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={pending || usages.length > 0}>
            <Trash2 size={16} aria-hidden="true" /> Xóa
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={pending}
        danger
        title="Xóa bản ghi này?"
        confirmLabel="Xóa"
        message={
          <p>
            Bản ghi <strong>{String(value.id)}</strong> sẽ bị xóa khỏi ứng dụng. Thao tác được ghi vào Nhật ký, và bạn có thể khôi phục bản cũ từ đó.
          </p>
        }
      />
    </form>
  );
}
