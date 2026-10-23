import { DENSITY_TOKENS, FONT_STACKS, defaultTheme } from "@/config/theme";
import { ThemeSettingsSchema, type ThemeSettings } from "./settings-schemas";

/* ───────────── Màu & độ tương phản (WCAG 2.1) ───────────── */

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Màu chữ (trắng hoặc gần đen) đọc rõ nhất trên nền `hex`. */
export function readableOn(hex: string): string {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#111827") ? "#ffffff" : "#111827";
}

export interface ContrastWarning {
  mode: "light" | "dark";
  pair: string;
  ratio: number;
  min: number;
}

/** Cảnh báo cặp màu kém tương phản (chữ thường ≥ 4.5:1). Trả về danh sách rỗng nếu ổn. */
export function contrastWarnings(theme: ThemeSettings): ContrastWarning[] {
  const out: ContrastWarning[] = [];
  for (const mode of ["light", "dark"] as const) {
    const c = theme.colors[mode];
    const checks: [string, string, string][] = [
      ["Chữ trên nền", c.foreground, c.background],
      ["Màu chủ đạo trên nền (liên kết, viền nhấn)", c.primary, c.background],
      ["Màu nhấn trên nền", c.accent, c.background],
    ];
    for (const [pair, fg, bg] of checks) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < 4.5) out.push({ mode, pair, ratio: Math.round(ratio * 100) / 100, min: 4.5 });
    }
  }
  return out;
}

/* ───────────── Sinh CSS từ theme ───────────── */

const STATUS_COLORS = {
  light: { success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  dark: { success: "#4ade80", warning: "#fbbf24", danger: "#f87171" },
} as const;

function modeVars(mode: "light" | "dark", t: ThemeSettings): string {
  const c = t.colors[mode];
  const card =
    mode === "light"
      ? "color-mix(in oklab, var(--background), white 65%)"
      : "color-mix(in oklab, var(--background), white 6%)";
  const shadowRgb = mode === "light" ? "20 30 60" : "0 0 0";
  const shadowAlpha = mode === "light" ? [0.06, 0.08] : [0.35, 0.4];
  const styleVars = {
    elevated: {
      bg: card,
      border: "transparent",
      width: "1px",
      shadow: `0 1px 2px rgb(${shadowRgb} / ${shadowAlpha[0]}), 0 6px 18px rgb(${shadowRgb} / ${shadowAlpha[1]})`,
    },
    outlined: { bg: card, border: "var(--border)", width: "1px", shadow: "none" },
    flat: { bg: "var(--muted)", border: "transparent", width: "1px", shadow: "none" },
    soft: {
      bg: "color-mix(in oklab, var(--primary) 8%, var(--background))",
      border: "transparent",
      width: "1px",
      shadow: "none",
    },
  }[t.cardStyle];
  const s = STATUS_COLORS[mode];
  return [
    `--primary:${c.primary}`,
    `--primary-foreground:${readableOn(c.primary)}`,
    `--accent:${c.accent}`,
    `--accent-foreground:${readableOn(c.accent)}`,
    `--background:${c.background}`,
    `--foreground:${c.foreground}`,
    `--card:${card}`,
    `--muted:color-mix(in oklab, var(--background) 93%, var(--foreground))`,
    `--muted-foreground:color-mix(in oklab, var(--foreground) 64%, var(--background))`,
    `--border:color-mix(in oklab, var(--foreground) 15%, var(--background))`,
    `--ring:var(--primary)`,
    `--success:${s.success}`,
    `--warning:${s.warning}`,
    `--danger:${s.danger}`,
    `--card-bg:${styleVars.bg}`,
    `--card-border:${styleVars.border}`,
    `--card-border-width:${styleVars.width}`,
    `--card-shadow:${styleVars.shadow}`,
    `color-scheme:${mode}`,
  ].join(";");
}

/**
 * Trả về CSS cho thẻ <style>. CHỈ nhận ThemeSettings đã qua Zod (màu hex 6 ký tự, enum, số có giới hạn)
 * nên không thể chèn CSS/HTML tùy ý. Hàm tự validate lại và fallback về mặc định nếu dữ liệu hỏng.
 */
export function themeToCss(input: unknown): string {
  const parsed = ThemeSettingsSchema.safeParse(input);
  const t = parsed.success ? parsed.data : defaultTheme;
  const d = DENSITY_TOKENS[t.density];
  const shared = [
    `--radius:${t.radius}px`,
    `--card-padding:${d.cardPadding}`,
    `--gap:${d.gap}`,
    `--page-padding:${d.pagePadding}`,
    `--font-body:${FONT_STACKS.body[t.fontBody]}`,
    `--font-jp:${FONT_STACKS.jp[t.fontJp]}`,
  ].join(";");
  const light = modeVars("light", t);
  const dark = modeVars("dark", t);
  return [
    `:root{${shared};${light}}`,
    `html[data-theme="dark"]{${dark}}`,
    `@media (prefers-color-scheme: dark){html:not([data-theme]){${dark}}}`,
    `html{font-size:${t.baseFontSize}px}`,
  ].join("\n");
}
