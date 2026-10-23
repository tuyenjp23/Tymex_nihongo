"use client";
import * as React from "react";
import { applyDisplayPrefs, readDisplayPrefs, type DisplayPrefs, type ThemePref } from "@/lib/display";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "@/components/icons";

function Toggle({ pressed, onClick, children, label }: { pressed: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "nc-touch h-9 whitespace-nowrap rounded-md border px-2.5 text-sm font-medium transition-colors",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** Nút bật/tắt Furigana, Romaji và chủ đề sáng/tối. Trạng thái nằm ở thuộc tính trên <html> nên áp dụng ngay cho toàn app. */
export function DisplayControls({ defaultFurigana }: { defaultFurigana: boolean }) {
  const [prefs, setPrefs] = React.useState<DisplayPrefs | null>(null);
  // Chỉ đọc giao diện thực tế (sáng/tối) SAU khi mount để HTML server và client khớp nhau.
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    setPrefs(readDisplayPrefs(defaultFurigana));
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
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
    setPrefs((cur) => {
      const next = { ...(cur ?? readDisplayPrefs(defaultFurigana)), ...patch };
      applyDisplayPrefs(next);
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
      return next;
    });
  }

  const p = prefs ?? { furigana: defaultFurigana, romaji: false, theme: "system" as ThemePref };

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Tùy chọn hiển thị">
      <Toggle pressed={p.furigana} onClick={() => update({ furigana: !p.furigana })} label="Hiện/ẩn furigana (cách đọc trên Kanji)">
        <span className="jp text-xs"><span className="sm:hidden">ふ</span><span className="hidden sm:inline">ふりがな</span></span>
      </Toggle>
      <Toggle pressed={p.romaji} onClick={() => update({ romaji: !p.romaji })} label="Hiện/ẩn romaji">
        Aa
      </Toggle>
      <button
        type="button"
        aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        title={dark ? "Giao diện sáng" : "Giao diện tối"}
        onClick={() => update({ theme: dark ? "light" : "dark" })}
        className="nc-touch grid h-9 w-9 place-items-center rounded-md border border-border bg-card hover:bg-muted"
      >
        {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
