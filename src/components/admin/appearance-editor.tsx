"use client";
import * as React from "react";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/states";
import { Icon } from "@/components/icons";
import { ImageUpload } from "./image-upload";
import { SaveBar, SettingHistory, useSettingEditor, type VersionInfo } from "./setting-parts";
import { contrastRatio, contrastWarnings, readableOn } from "@/lib/theme";
import { CARD_STYLES, DENSITIES, FONT_BODIES, FONT_JPS, type ContentSettings, type DashboardSettings, type NavigationSettings, type ThemeSettings } from "@/lib/settings-schemas";
import { CARD_STYLE_LABELS, DENSITY_LABELS, DENSITY_TOKENS, FONT_LABELS, FONT_STACKS, defaultTheme } from "@/config/theme";
import { defaultNavigation, LOCKED_NAV_IDS } from "@/config/navigation";
import { dashboardSectionDefs, defaultDashboardSections } from "@/config/dashboard";
import { cn } from "@/lib/utils";

export interface AppearanceData {
  theme: ThemeSettings;
  navigation: NavigationSettings["items"];
  dashboard: DashboardSettings["sections"];
  content: ContentSettings;
  history: Record<"theme" | "navigation" | "dashboard" | "content", VersionInfo[]>;
}

const defaultContent: ContentSettings = { showUnverified: true, defaultFurigana: true };

/* ───────────── Ô chọn màu ───────────── */
function ColorField({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} (bảng chọn màu)`} value={valid ? value.toLowerCase() : "#000000"} onChange={(e) => onChange(e.target.value)} className="nc-touch h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-card p-1" />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} className="font-mono" aria-invalid={!valid || undefined} />
      </div>
    </Field>
  );
}

/* ───────────── Xem trước (mô phỏng bằng style nội tuyến) ───────────── */
function ThemePreview({ theme, mode }: { theme: ThemeSettings; mode: "light" | "dark" }) {
  const c = theme.colors[mode];
  const valid = [c.primary, c.accent, c.background, c.foreground].every((h) => /^#[0-9a-fA-F]{6}$/.test(h));
  if (!valid) return <p className="text-sm text-muted-foreground">Nhập đủ màu hợp lệ (#RRGGBB) để xem trước.</p>;
  const d = DENSITY_TOKENS[theme.density];
  const border = `color-mix(in oklab, ${c.foreground} 15%, ${c.background})`;
  const cardBg =
    theme.cardStyle === "soft" ? `color-mix(in oklab, ${c.primary} 8%, ${c.background})` : theme.cardStyle === "flat" ? `color-mix(in oklab, ${c.background} 93%, ${c.foreground})` : `color-mix(in oklab, ${c.background}, ${mode === "light" ? "white 65%" : "white 6%"})`;
  return (
    <div
      aria-label="Xem trước giao diện"
      role="img"
      style={{ background: c.background, color: c.foreground, padding: d.pagePadding, borderRadius: theme.radius, border: `1px solid ${border}`, fontFamily: FONT_STACKS.body[theme.fontBody], fontSize: `${theme.baseFontSize}px` }}
    >
      <p style={{ fontWeight: 700, fontSize: "1.1em" }}>
        {theme.appName || "Tên ứng dụng"} <span style={{ fontFamily: FONT_STACKS.jp[theme.fontJp], opacity: 0.7, fontWeight: 400 }}>{theme.appNameJa}</span>
      </p>
      <div
        style={{
          marginTop: d.gap,
          background: cardBg,
          borderRadius: theme.radius,
          padding: d.cardPadding,
          border: theme.cardStyle === "outlined" ? `1px solid ${border}` : "1px solid transparent",
          boxShadow: theme.cardStyle === "elevated" ? "0 1px 2px rgb(0 0 0 / .08), 0 6px 18px rgb(0 0 0 / .08)" : "none",
        }}
      >
        <p style={{ fontFamily: FONT_STACKS.jp[theme.fontJp], fontSize: "1.5em" }} lang="ja">
          勉強する
        </p>
        <p style={{ opacity: 0.7, fontSize: "0.9em" }}>học, học tập</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ background: c.primary, color: readableOn(c.primary), padding: "6px 14px", borderRadius: Math.min(theme.radius, 20), fontSize: "0.9em", fontWeight: 500 }}>Nút chính</span>
          <span style={{ background: c.accent, color: readableOn(c.accent), padding: "2px 10px", borderRadius: 999, fontSize: "0.8em" }}>N5</span>
          <span style={{ color: c.primary, textDecoration: "underline", fontSize: "0.9em" }}>Liên kết</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Tab Giao diện ───────────── */
function ThemeTab({ ed }: { ed: ReturnType<typeof useSettingEditor<ThemeSettings>> }) {
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const t = ed.value;
  const err = (p: string) => ed.errors.find((e) => e.path === p)?.message;
  const set = <K extends keyof ThemeSettings>(k: K, v: ThemeSettings[K]) => ed.update((cur) => ({ ...cur, [k]: v }));
  const setColor = (m: "light" | "dark", k: keyof ThemeSettings["colors"]["light"], v: string) => ed.update((cur) => ({ ...cur, colors: { ...cur.colors, [m]: { ...cur.colors[m], [k]: v } } }));
  const colorsOk = (["light", "dark"] as const).every((m) => Object.values(t.colors[m]).every((h) => /^#[0-9a-fA-F]{6}$/.test(h)));
  const warns = colorsOk ? contrastWarnings(t) : [];
  const ratio = colorsOk ? contrastRatio(t.colors[mode].foreground, t.colors[mode].background) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card className="space-y-4">
          <CardTitle>Thương hiệu</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên ứng dụng" htmlFor="th-name" required error={err("appName")}>
              <Input id="th-name" value={t.appName} maxLength={40} onChange={(e) => set("appName", e.target.value)} />
            </Field>
            <Field label="Tên tiếng Nhật (phụ đề)" htmlFor="th-nameja" error={err("appNameJa")}>
              <Input id="th-nameja" lang="ja" value={t.appNameJa} maxLength={40} onChange={(e) => set("appNameJa", e.target.value)} />
            </Field>
            <Field label="Khẩu hiệu" htmlFor="th-tag" className="md:col-span-2" error={err("tagline")}>
              <Input id="th-tag" value={t.tagline} maxLength={160} onChange={(e) => set("tagline", e.target.value)} />
            </Field>
            <Field label="Logo (URL)" htmlFor="th-logo" hint="Đường dẫn bắt đầu bằng / hoặc https://. Để trống = dùng chữ." error={err("logoUrl")}>
              <Input id="th-logo" value={t.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value.trim() === "" ? null : e.target.value.trim())} />
              <ImageUpload label="Tải logo lên" onUploaded={(p) => set("logoUrl", p)} />
            </Field>
            <Field label="Favicon (URL)" htmlFor="th-fav" hint="Ảnh PNG vuông nhỏ. Để trống = icon mặc định." error={err("faviconUrl")}>
              <Input id="th-fav" value={t.faviconUrl ?? ""} onChange={(e) => set("faviconUrl", e.target.value.trim() === "" ? null : e.target.value.trim())} />
              <ImageUpload label="Tải favicon lên" onUploaded={(p) => set("faviconUrl", p)} />
            </Field>
          </div>
        </Card>

        {(["light", "dark"] as const).map((m) => (
          <Card key={m} className="space-y-4">
            <CardTitle>{m === "light" ? "Màu — chế độ sáng" : "Màu — chế độ tối"}</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField id={`th-${m}-primary`} label="Màu chủ đạo" value={t.colors[m].primary} onChange={(v) => setColor(m, "primary", v)} error={err(`colors.${m}.primary`)} />
              <ColorField id={`th-${m}-accent`} label="Màu nhấn" value={t.colors[m].accent} onChange={(v) => setColor(m, "accent", v)} error={err(`colors.${m}.accent`)} />
              <ColorField id={`th-${m}-bg`} label="Màu nền" value={t.colors[m].background} onChange={(v) => setColor(m, "background", v)} error={err(`colors.${m}.background`)} />
              <ColorField id={`th-${m}-fg`} label="Màu chữ" value={t.colors[m].foreground} onChange={(v) => setColor(m, "foreground", v)} error={err(`colors.${m}.foreground`)} />
            </div>
          </Card>
        ))}

        <Card className="space-y-4">
          <CardTitle>Kiểu dáng</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Bo góc: ${t.radius}px`} htmlFor="th-radius" error={err("radius")}>
              <input id="th-radius" type="range" min={0} max={28} step={1} value={t.radius} onChange={(e) => set("radius", Number(e.target.value))} className="w-full" />
            </Field>
            <Field label={`Cỡ chữ cơ bản: ${t.baseFontSize}px`} htmlFor="th-fs" error={err("baseFontSize")}>
              <input id="th-fs" type="range" min={14} max={20} step={1} value={t.baseFontSize} onChange={(e) => set("baseFontSize", Number(e.target.value))} className="w-full" />
            </Field>
            <Field label="Mật độ" htmlFor="th-density">
              <Select id="th-density" value={t.density} onChange={(e) => set("density", e.target.value as ThemeSettings["density"])}>
                {DENSITIES.map((d) => (
                  <option key={d} value={d}>{DENSITY_LABELS[d]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Kiểu thẻ" htmlFor="th-card">
              <Select id="th-card" value={t.cardStyle} onChange={(e) => set("cardStyle", e.target.value as ThemeSettings["cardStyle"])}>
                {CARD_STYLES.map((d) => (
                  <option key={d} value={d}>{CARD_STYLE_LABELS[d]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Font giao diện" htmlFor="th-fb">
              <Select id="th-fb" value={t.fontBody} onChange={(e) => set("fontBody", e.target.value as ThemeSettings["fontBody"])}>
                {FONT_BODIES.map((d) => (
                  <option key={d} value={d}>{FONT_LABELS.body[d]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Font chữ Nhật" htmlFor="th-fj" hint="Dùng font có sẵn trong máy người học (không tải font ngoài).">
              <Select id="th-fj" value={t.fontJp} onChange={(e) => set("fontJp", e.target.value as ThemeSettings["fontJp"])}>
                {FONT_JPS.map((d) => (
                  <option key={d} value={d}>{FONT_LABELS.jp[d]}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <SaveBar dirty={ed.dirty} pending={ed.pending} onSave={ed.save} errors={ed.errors} conflict={ed.conflict} warnings={ed.warnings} onDefaults={() => ed.replace(defaultTheme)} />
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Xem trước</CardTitle>
            <div role="group" aria-label="Chế độ xem trước" className="flex gap-1">
              {(["light", "dark"] as const).map((m) => (
                <Button key={m} type="button" size="sm" variant={mode === m ? "primary" : "outline"} aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m === "light" ? "Sáng" : "Tối"}
                </Button>
              ))}
            </div>
          </div>
          <ThemePreview theme={t} mode={mode} />
          {colorsOk ? (
            <p className="text-xs text-muted-foreground">Tương phản chữ/nền: <strong>{ratio.toFixed(2)}:1</strong> (khuyến nghị ≥ 4.5:1)</p>
          ) : null}
          {warns.length > 0 ? (
            <Alert tone="warning" title="Một số cặp màu khó đọc">
              <ul className="list-disc pl-4">
                {warns.map((w) => (
                  <li key={`${w.mode}-${w.pair}`}>{w.mode === "light" ? "Sáng" : "Tối"} · {w.pair}: {w.ratio}:1</li>
                ))}
              </ul>
            </Alert>
          ) : colorsOk ? (
            <p className="text-xs text-success">Các cặp màu chính đều đủ tương phản (≥ 4.5:1).</p>
          ) : null}
          <CardDescription>Bản xem trước mô phỏng; thay đổi chỉ áp dụng cho người học sau khi bấm Lưu.</CardDescription>
        </Card>
      </div>
    </div>
  );
}

/* ───────────── Tab Menu ───────────── */
function ReorderList<T extends { id: string; enabled: boolean }>({ items, onChange, render, locked }: { items: T[]; onChange: (items: T[]) => void; render: (item: T, patch: (p: Partial<T>) => void) => React.ReactNode; locked?: Set<string> }) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={it.id} className={cn("flex flex-wrap items-center gap-3 rounded-md border border-border p-3", !it.enabled && "opacity-70")}>
          <div className="min-w-0 flex-1">{render(it, (p) => onChange(items.map((x, k) => (k === i ? { ...x, ...p } : x))))}</div>
          <Switch checked={it.enabled} disabled={locked?.has(it.id)} onChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, enabled: v } : x)))} label={`${it.enabled ? "Đang bật" : "Đang tắt"}: ${it.id}`} />
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Chuyển ${it.id} lên`}>Lên</Button>
            <Button type="button" size="sm" variant="outline" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Chuyển ${it.id} xuống`}>Xuống</Button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NavTab({ ed }: { ed: ReturnType<typeof useSettingEditor<NavigationSettings>> }) {
  const defs = new Map(defaultNavigation.map((d) => [d.id, d]));
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <CardTitle>Menu điều hướng</CardTitle>
          <CardDescription className="mt-1">Đổi tên, bật/tắt và sắp xếp. Mục bị tắt sẽ biến mất khỏi menu và trang của nó trả về &quot;không tìm thấy&quot;. &quot;Tổng quan&quot; luôn bật.</CardDescription>
        </div>
        <ReorderList
          items={ed.value.items}
          locked={LOCKED_NAV_IDS}
          onChange={(items) => ed.update(() => ({ items }))}
          render={(it, patch) => {
            const d = defs.get(it.id);
            return (
              <div className="flex items-center gap-3">
                <Icon name={d?.icon ?? "home"} size={18} className="shrink-0 text-muted-foreground" />
                <Field label="Tên hiển thị" htmlFor={`nav-${it.id}`} className="min-w-0 flex-1">
                  <Input id={`nav-${it.id}`} value={it.label} maxLength={40} onChange={(e) => patch({ label: e.target.value })} />
                </Field>
                <code className="hidden text-xs text-muted-foreground sm:block">{d?.href}</code>
              </div>
            );
          }}
        />
      </Card>
      <SaveBar dirty={ed.dirty} pending={ed.pending} onSave={ed.save} errors={ed.errors} conflict={ed.conflict} onDefaults={() => ed.replace({ items: defaultNavigation.map((d) => ({ id: d.id, label: d.label, enabled: true })) })} />
    </div>
  );
}

function DashTab({ ed }: { ed: ReturnType<typeof useSettingEditor<DashboardSettings>> }) {
  const defs = new Map(dashboardSectionDefs.map((d) => [d.id, d]));
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <CardTitle>Các khối trên trang Tổng quan</CardTitle>
          <CardDescription className="mt-1">Bật/tắt và sắp xếp thứ tự các khối hiển thị cho người học.</CardDescription>
        </div>
        <ReorderList
          items={ed.value.sections}
          onChange={(sections) => ed.update(() => ({ sections }))}
          render={(it) => (
            <div>
              <p className="font-medium">{defs.get(it.id)?.label ?? it.id}</p>
              <p className="text-xs text-muted-foreground">{defs.get(it.id)?.description}</p>
            </div>
          )}
        />
      </Card>
      <SaveBar dirty={ed.dirty} pending={ed.pending} onSave={ed.save} errors={ed.errors} conflict={ed.conflict} onDefaults={() => ed.replace({ sections: defaultDashboardSections.map((s) => ({ ...s })) })} />
    </div>
  );
}

function ContentTab({ ed }: { ed: ReturnType<typeof useSettingEditor<ContentSettings>> }) {
  const v = ed.value;
  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <CardTitle>Hiển thị nội dung</CardTitle>
        <div className="flex items-start gap-3">
          <Switch id="ct-unv" checked={v.showUnverified} onChange={(b) => ed.update((c) => ({ ...c, showUnverified: b }))} label="Hiển thị nội dung chưa xác minh" />
          <label htmlFor="ct-unv" className="text-sm">
            <span className="font-medium">Cho người học thấy nội dung chưa xác minh</span>
            <span className="block text-muted-foreground">Bật: nội dung AI soạn / cần rà soát vẫn hiện, kèm huy hiệu cảnh báo rõ ràng. Tắt: chỉ hiện nội dung &quot;Đã xác minh&quot; hoặc &quot;Đã xuất bản&quot;. Bản nháp và nội dung đánh dấu Ẩn luôn bị ẩn với người học.</span>
          </label>
        </div>
        <div className="flex items-start gap-3">
          <Switch id="ct-furi" checked={v.defaultFurigana} onChange={(b) => ed.update((c) => ({ ...c, defaultFurigana: b }))} label="Bật furigana mặc định" />
          <label htmlFor="ct-furi" className="text-sm">
            <span className="font-medium">Bật furigana mặc định cho người học mới</span>
            <span className="block text-muted-foreground">Người học vẫn tự bật/tắt được trên thanh trên cùng; lựa chọn của họ được ưu tiên.</span>
          </label>
        </div>
      </Card>
      <SaveBar dirty={ed.dirty} pending={ed.pending} onSave={ed.save} errors={ed.errors} conflict={ed.conflict} onDefaults={() => ed.replace(defaultContent)} />
    </div>
  );
}

/* ───────────── Tổng ───────────── */
export function AppearanceEditor({ data }: { data: AppearanceData }) {
  // Trạng thái nằm ở đây (không nằm trong tab) vì Tabs chỉ mount tab đang mở
  const theme = useSettingEditor<ThemeSettings>("theme", data.theme, data.history.theme[0]?.version ?? 0);
  const navigation = useSettingEditor<NavigationSettings>("navigation", { items: data.navigation }, data.history.navigation[0]?.version ?? 0);
  const dashboard = useSettingEditor<DashboardSettings>("dashboard", { sections: data.dashboard }, data.history.dashboard[0]?.version ?? 0);
  const content = useSettingEditor<ContentSettings>("content", data.content, data.history.content[0]?.version ?? 0);
  const dot = (d: boolean) => (d ? <span className="ml-1 text-warning" aria-label="có thay đổi chưa lưu">●</span> : null);

  return (
    <Tabs
      tabs={[
        { id: "theme", label: <>Thương hiệu & giao diện{dot(theme.dirty)}</>, content: (<div className="space-y-6"><ThemeTab ed={theme} /><SettingHistory settingKey="theme" history={data.history.theme} /></div>) },
        { id: "nav", label: <>Menu{dot(navigation.dirty)}</>, content: (<div className="space-y-6"><NavTab ed={navigation} /><SettingHistory settingKey="navigation" history={data.history.navigation} /></div>) },
        { id: "dash", label: <>Tổng quan{dot(dashboard.dirty)}</>, content: (<div className="space-y-6"><DashTab ed={dashboard} /><SettingHistory settingKey="dashboard" history={data.history.dashboard} /></div>) },
        { id: "content", label: <>Nội dung{dot(content.dirty)}</>, content: (<div className="space-y-6"><ContentTab ed={content} /><SettingHistory settingKey="content" history={data.history.content} /></div>) },
      ]}
    />
  );
}
