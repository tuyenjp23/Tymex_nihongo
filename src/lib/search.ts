import { normalizeForSearch, toRomaji } from "./kana";
import { stripRuby } from "./furigana";

/** Chuẩn hóa một danh sách trường văn bản thành chuỗi tìm kiếm một lần (index). */
export function buildSearchIndex(fields: (string | undefined | null)[]): string {
  return normalizeForSearch(
    fields
      .filter((f): f is string => !!f)
      .map((f) => stripRuby(f))
      .join(" "),
  );
}

/**
 * Khớp truy vấn: mọi từ trong truy vấn (cách nhau bằng khoảng trắng) đều phải xuất hiện trong index.
 * Hỗ trợ Kanji, Hiragana/Katakana (coi như nhau), tiếng Việt có/không dấu và Romaji.
 */
export function matchesQuery(index: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return q.split(" ").every((term) => index.includes(term));
}

/** Thêm romaji của cách đọc kana vào index để gõ "yama" vẫn tìm thấy 山. */
export function withRomaji(kana: string | undefined | null): string {
  return kana ? toRomaji(kana) : "";
}

export function highlightRanges(text: string, query: string): { text: string; match: boolean }[] {
  const terms = normalizeForSearch(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const marks = new Array(text.length).fill(false);
  for (const t of terms) {
    let from = 0;
    for (;;) {
      const i = lower.indexOf(t, from);
      if (i === -1) break;
      for (let k = i; k < i + t.length; k++) marks[k] = true;
      from = i + t.length;
    }
  }
  const out: { text: string; match: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1];
    if (last && last.match === marks[i]) last.text += text[i];
    else out.push({ text: text[i], match: marks[i] });
  }
  return out;
}
