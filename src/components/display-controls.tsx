"use client";
import * as React from "react";
import { DISPLAY_EVENT, applyDisplayPrefs, readDisplayPrefs, type DisplayPrefs, type FontScale } from "@/lib/display";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "@/components/icons";

function Toggle({ pressed, onClick, children, label, className }: { pressed: boolean; onClick: () => void; children: React.ReactNode; label: string; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "nc-touch h-9 whitespace-nowrap rounded-lg border px-2.5 text-sm font-medium transition-colors",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

const SCALES: { id: FontScale; label: string; cls: string }[] = [
  { id: "sm", label: "Cỡ chữ nhỏ", cls: "text-[11px]" },
  { id: "md", label: "Cỡ chữ vừa (mặc định)", cls: "text-[14px]" },
  { id: "lg", label: "Cỡ chữ lớn", cls: "text-[17px]" },
  { id: "xl", label: "Cỡ chữ rất lớn", cls: "text-[20px]" },
];

/** Chọn cỡ chữ (4 mức). Các nút dùng aria-pressed nên không chỉ dựa vào màu để thể hiện mức đang chọn. */
function FontScaleControl({ value, onChange }: { value: FontScale; onChange: (v: FontScale) => void }) {
  return (
    <div role="group" aria-label="Cỡ chữ" className="inline-flex items-center overflow-hidden rounded-lg border border-border bg-card">
      {SCALES.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={value === s.id}
          aria-label={s.label}
          title={s.label}
          onClick={() => onChange(s.id)}
          className={cn(
            "nc-touch grid h-9 w-8 place-items-center font-semibold leading-none transition-colors",
            s.cls,
            value === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          A
        </button>
      ))}
    </div>
  );
}

/**
 * Nút bật/tắt Furigana, Romaji, cỡ chữ và chủ đề sáng/tối. Trạng thái nằm ở thuộc tính trên <html> nên áp dụng ngay cho toàn app.
 *  - variant "bar": gọn, đặt trên thanh trên cùng (ẩn bớt trên điện thoại)
 *  - variant "panel": đầy đủ, đặt trong menu trượt trên điện thoại
 */
export function DisplayControls({ defaultFurigana, variant = "bar" }: { defaultFurigana: boolean; variant?: "bar" | "panel" }) {
  const [prefs, setPrefs] = React.useState<DisplayPrefs | null>(null);
  // Chỉ đọc giao diện thực tế (sáng/tối) SAU khi mount để HTML server và client khớp nhau.
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const sync = () => {
      setPrefs(readDisplayPrefs(defaultFurigana));
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
    };
    sync();
    window.addEventListener(DISPLAY_EVENT, sync);
    return () => window.removeEventListener(DISPLAY_EVENT, sync);
  }, [defaultFurigana]);

  // Khi chọn "theo hệ thống", đổi theo thay đổi của hệ điều hành.
  React.useEffect(() => {
    if (!prefs || prefs.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      applyDisplayPrefs(prefs);
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [prefs]);

  function update(patch: Partial<DisplayPrefs>) {
    const next = { ...(prefs ?? readDisplayPrefs(defaultFurigana)), ...patch };
    setPrefs(next);
    applyDisplayPrefs(next); // phát sự kiện → mọi bản điều khiển khác tự đọc lại
  }

  const p: DisplayPrefs = prefs ?? { fontScale: "md", furigana: defaultFurigana, romaji: false, theme: "system" };
  const isPanel = variant === "panel";

  return (
    <div className={cn("flex items-center gap-1.5", isPanel && "flex-wrap")} role="group" aria-label="Tùy chọn hiển thị">
      <Toggle pressed={p.furigana} onClick={() => update({ furigana: !p.furigana })} label="Hiện/ẩn furigana (cách đọc trên Kanji)">
        <span className="jp text-xs"><span className={isPanel ? "hidden" : "sm:hidden"}>ふ</span><span className={isPanel ? "inline" : "hidden sm:inline"}>ふりがな</span></span>
      </Toggle>
      <span className={isPanel ? "contents" : "hidden md:contents"}>
        <FontScaleControl value={p.fontScale} onChange={(fontScale) => update({ fontScale })} />
      </span>
      <span className={isPanel ? "contents" : "hidden md:contents"}>
        <Toggle pressed={p.romaji} onClick={() => update({ romaji: !p.romaji })} label="Hiện/ẩn romaji">
          Aa
        </Toggle>
      </span>
      <button
        type="button"
        aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        title={dark ? "Giao diện sáng" : "Giao diện tối"}
        onClick={() => update({ theme: dark ? "light" : "dark" })}
        className="nc-touch grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-muted"
      >
        {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
