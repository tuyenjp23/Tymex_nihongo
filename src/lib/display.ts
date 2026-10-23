/** Tùy chọn hiển thị phía người học (lưu trong localStorage, áp dụng bằng thuộc tính trên <html>). */
export const DISPLAY_KEY = "nc.display.v1";
export const DISPLAY_EVENT = "nc-display-change";
export type ThemePref = "system" | "light" | "dark";
/** Cỡ chữ do người học chọn (sm 90% · md = theo theme · lg 112,5% · xl 125%) */
export type FontScale = "sm" | "md" | "lg" | "xl";
export const FONT_SCALES: FontScale[] = ["sm", "md", "lg", "xl"];
export interface DisplayPrefs {
  fontScale: FontScale;
  furigana: boolean;
  romaji: boolean;
  theme: ThemePref;
}

/**
 * Script chạy TRƯỚC khi vẽ trang (inline trong <head>) để không bị nháy sáng/tối hoặc nháy furigana.
 * Nội dung hoàn toàn cố định (chỉ nhúng một boolean), không chứa dữ liệu người dùng.
 */
export function displayInitScript(defaultFurigana: boolean): string {
  return `(function(){try{var d=${JSON.stringify(defaultFurigana)};var p={};try{p=JSON.parse(localStorage.getItem(${JSON.stringify(DISPLAY_KEY)})||"{}")||{}}catch(e){}var r=document.documentElement;var t=p.theme==="light"||p.theme==="dark"?p.theme:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");r.setAttribute("data-theme",t);r.setAttribute("data-furigana",(typeof p.furigana==="boolean"?p.furigana:d)?"on":"off");r.setAttribute("data-romaji",p.romaji===true?"on":"off");var f=p.fontScale;if(f==="sm"||f==="lg"||f==="xl")r.setAttribute("data-fs",f);else r.removeAttribute("data-fs");}catch(e){}})();`;
}

export function readDisplayPrefs(defaultFurigana: boolean): DisplayPrefs {
  let p: Partial<DisplayPrefs> = {};
  try {
    p = JSON.parse(window.localStorage.getItem(DISPLAY_KEY) || "{}") ?? {};
  } catch {
    p = {};
  }
  return {
    fontScale: p.fontScale === "sm" || p.fontScale === "lg" || p.fontScale === "xl" ? p.fontScale : "md",
    furigana: typeof p.furigana === "boolean" ? p.furigana : defaultFurigana,
    romaji: p.romaji === true,
    theme: p.theme === "light" || p.theme === "dark" ? p.theme : "system",
  };
}

export function applyDisplayPrefs(p: DisplayPrefs) {
  const r = document.documentElement;
  const resolved = p.theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : p.theme;
  r.setAttribute("data-theme", resolved);
  r.setAttribute("data-furigana", p.furigana ? "on" : "off");
  r.setAttribute("data-romaji", p.romaji ? "on" : "off");
  if (p.fontScale === "md") r.removeAttribute("data-fs");
  else r.setAttribute("data-fs", p.fontScale);
  try {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(p));
  } catch {
    /* chế độ riêng tư: bỏ qua, vẫn áp dụng cho phiên hiện tại */
  }
  // Báo cho các nút điều khiển khác trên trang (thanh trên + menu điện thoại) đọc lại để không lệch trạng thái
  window.dispatchEvent(new Event(DISPLAY_EVENT));
}
