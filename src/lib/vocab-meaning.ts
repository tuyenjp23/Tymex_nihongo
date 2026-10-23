/**
 * Nghĩa hiển thị cho từ vựng/Kanji. Dữ liệu nhập từ nguồn mở thường chỉ có nghĩa tiếng Anh; dữ liệu cũ (bản mẫu) có thể chưa có các trường mới
 * → mọi hàm ở đây chịu được trường thiếu (undefined) lúc chạy.
 */
export interface MeaningLike {
  meaning_vi?: string;
  vi_kind?: string;
  status?: string;
  senses?: { glosses?: { lang: string; text: string }[] }[];
  meanings_en?: string[];
}

export const MACHINE_VI_NOTE = "Nghĩa tiếng Việt do máy dịch, chưa được người kiểm tra.";

export const hasVietnamese = (r: MeaningLike): boolean => (r.meaning_vi ?? "").trim().length > 0;

/** Có tiếng Việt nhưng là bản dịch máy chưa được người xác minh. */
export const isMachineVietnamese = (r: MeaningLike): boolean => hasVietnamese(r) && r.vi_kind === "machine_translated" && r.status !== "verified" && r.status !== "published";

export function englishGlosses(r: MeaningLike, max = 4): string[] {
  const out: string[] = [];
  for (const s of r.senses ?? []) for (const g of s.glosses ?? []) if (g.lang === "en" && !out.includes(g.text)) out.push(g.text);
  for (const m of r.meanings_en ?? []) if (!out.includes(m)) out.push(m);
  return out.slice(0, max);
}

/** Chuỗi nghĩa để hiện trong danh sách: tiếng Việt nếu có, nếu không thì nghĩa gốc tiếng Anh (có tiền tố "EN:" để người học biết). */
export function meaningText(r: MeaningLike): string {
  if (hasVietnamese(r)) return (r.meaning_vi ?? "").trim();
  const en = englishGlosses(r, 3).join("; ");
  return en ? `EN: ${en}` : "";
}

/** Dòng Hán–Việt + nghĩa cho Kanji. */
export function kanjiLine(k: MeaningLike & { han_viet?: string }): string {
  return [k.han_viet, meaningText(k)].filter(Boolean).join(" — ");
}

/** Văn bản tiếng Anh thêm vào chỉ mục tìm kiếm (để tìm "school" ra 学校 ngay cả khi chưa có tiếng Việt). */
export const searchEnglish = (r: MeaningLike): string => englishGlosses(r, 8).join(" ");

/** Chỉ giữ mục có nghĩa tiếng Việt — dùng cho trò chơi, flashcard, ôn tập (nơi đáp án phải là tiếng Việt). */
export const withVietnamese = <T extends MeaningLike>(items: T[]): T[] => items.filter(hasVietnamese);
