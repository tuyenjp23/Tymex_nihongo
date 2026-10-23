/**
 * Bảng chữ cái Hiragana/Katakana — dữ liệu tĩnh (hệ thống chữ viết là kiến thức đã ổn định, không phải nội dung cần xác minh theo nguồn).
 * Katakana và romaji được SUY RA từ bảng hiragana nên hai bảng luôn khớp nhau.
 * Lưu ý: chưa có dữ liệu thứ tự nét viết nên ứng dụng KHÔNG hiển thị thứ tự nét.
 */
import { hiraganaToKatakana, toRomaji } from "./kana";
import { shuffle, type Rng } from "./rng";
import { qualityFromChoice, isDue } from "./srs";
import type { SrsState } from "./srs";

export type KanaScript = "hiragana" | "katakana";
export type KanaGroupId = "basic" | "dakuten" | "yoon";

export interface KanaGroupDef {
  id: KanaGroupId;
  label: string;
  description: string;
  /** Tiêu đề cột (nguyên âm hoặc âm ghép) */
  cols: string[];
  /** Hàng: nhãn + các ô hiragana (null = ô trống trong bảng) */
  rows: { label: string; cells: (string | null)[] }[];
}

export const KANA_GROUPS: KanaGroupDef[] = [
  {
    id: "basic",
    label: "Âm cơ bản",
    description: "46 chữ cơ bản (五十音).",
    cols: ["a", "i", "u", "e", "o"],
    rows: [
      { label: "—", cells: ["あ", "い", "う", "え", "お"] },
      { label: "k", cells: ["か", "き", "く", "け", "こ"] },
      { label: "s", cells: ["さ", "し", "す", "せ", "そ"] },
      { label: "t", cells: ["た", "ち", "つ", "て", "と"] },
      { label: "n", cells: ["な", "に", "ぬ", "ね", "の"] },
      { label: "h", cells: ["は", "ひ", "ふ", "へ", "ほ"] },
      { label: "m", cells: ["ま", "み", "む", "め", "も"] },
      { label: "y", cells: ["や", null, "ゆ", null, "よ"] },
      { label: "r", cells: ["ら", "り", "る", "れ", "ろ"] },
      { label: "w", cells: ["わ", null, null, null, "を"] },
      { label: "n", cells: ["ん", null, null, null, null] },
    ],
  },
  {
    id: "dakuten",
    label: "Âm đục & bán đục",
    description: "Thêm dấu ゛(dakuten) hoặc ゜(handakuten): が ざ だ ば ぱ.",
    cols: ["a", "i", "u", "e", "o"],
    rows: [
      { label: "g", cells: ["が", "ぎ", "ぐ", "げ", "ご"] },
      { label: "z", cells: ["ざ", "じ", "ず", "ぜ", "ぞ"] },
      { label: "d", cells: ["だ", "ぢ", "づ", "で", "ど"] },
      { label: "b", cells: ["ば", "び", "ぶ", "べ", "ぼ"] },
      { label: "p", cells: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"] },
    ],
  },
  {
    id: "yoon",
    label: "Âm ghép",
    description: "Chữ nhỏ ゃ ゅ ょ ghép sau chữ cột い (拗音).",
    cols: ["ya", "yu", "yo"],
    rows: [
      { label: "ki", cells: ["きゃ", "きゅ", "きょ"] },
      { label: "shi", cells: ["しゃ", "しゅ", "しょ"] },
      { label: "chi", cells: ["ちゃ", "ちゅ", "ちょ"] },
      { label: "ni", cells: ["にゃ", "にゅ", "にょ"] },
      { label: "hi", cells: ["ひゃ", "ひゅ", "ひょ"] },
      { label: "mi", cells: ["みゃ", "みゅ", "みょ"] },
      { label: "ri", cells: ["りゃ", "りゅ", "りょ"] },
      { label: "gi", cells: ["ぎゃ", "ぎゅ", "ぎょ"] },
      { label: "ji", cells: ["じゃ", "じゅ", "じょ"] },
      { label: "bi", cells: ["びゃ", "びゅ", "びょ"] },
      { label: "pi", cells: ["ぴゃ", "ぴゅ", "ぴょ"] },
    ],
  },
];

export interface KanaChar {
  /** Ký tự hiển thị theo bảng chữ đang chọn (cũng là khóa lưu tiến độ) */
  char: string;
  script: KanaScript;
  group: KanaGroupId;
  hiragana: string;
  romaji: string;
}

/** Cách đọc đặc biệt cần chú thích thêm (ぢ/づ trùng âm với じ/ず; を đọc như お). */
export const KANA_NOTES: Record<string, string> = {
  を: "Trợ từ, đọc là “o” (đôi khi viết wo).",
  ぢ: "Đọc giống じ (ji); hiếm dùng.",
  づ: "Đọc giống ず (zu); hiếm dùng.",
  は: "Khi làm trợ từ (chủ đề) đọc là “wa”.",
  へ: "Khi làm trợ từ (hướng) đọc là “e”.",
  ん: "Âm mũi; đứng trước b/m/p thường nghe như “m”.",
};

export function kanaFor(hiragana: string, script: KanaScript, group: KanaGroupId): KanaChar {
  return { char: script === "hiragana" ? hiragana : hiraganaToKatakana(hiragana), script, group, hiragana, romaji: toRomaji(hiragana) };
}

export function kanaPool(groups: KanaGroupId[], scripts: KanaScript[]): KanaChar[] {
  const out: KanaChar[] = [];
  for (const g of KANA_GROUPS) {
    if (!groups.includes(g.id)) continue;
    for (const row of g.rows) for (const cell of row.cells) if (cell) for (const s of scripts) out.push(kanaFor(cell, s, g.id));
  }
  return out;
}

export type KanaDirection = "kana-to-romaji" | "romaji-to-kana";

export interface KanaQuestion {
  id: string;
  direction: KanaDirection;
  target: KanaChar;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
}

export interface KanaQuizOptions {
  count: number;
  direction: KanaDirection | "mixed";
  rng: Rng;
  progress?: Record<string, SrsState>;
  today?: string;
}

/**
 * Sinh câu hỏi luyện kana (hàm thuần).
 *  - Ưu tiên chữ đến hạn ôn, rồi chữ chưa luyện, rồi chữ hay sai; phần còn lại xáo ngẫu nhiên.
 *  - kana→romaji: đáp án nhiễu có romaji KHÁC đáp án đúng và khác nhau.
 *  - romaji→kana: chỉ hỏi chữ có romaji DUY NHẤT trong bộ (tránh じ/ぢ cùng "ji" → có hai đáp án đúng).
 *  - Katakana và hiragana cùng bộ: nhiễu ưu tiên cùng bảng chữ để không lộ đáp án bằng hình dạng bảng.
 */
export function buildKanaQuiz(pool: KanaChar[], o: KanaQuizOptions): KanaQuestion[] {
  const byRomaji = new Map<string, KanaChar[]>();
  for (const k of pool) byRomaji.set(`${k.script}:${k.romaji}`, [...(byRomaji.get(`${k.script}:${k.romaji}`) ?? []), k]);
  const unique = (k: KanaChar) => (byRomaji.get(`${k.script}:${k.romaji}`)?.length ?? 0) === 1;

  const priority = (k: KanaChar): number => {
    const s = o.progress?.[k.char];
    if (!s || !s.last_reviewed) return 1;
    if (o.today && isDue(s, o.today)) return 0;
    if (s.lapses > 0) return 2;
    return 3;
  };
  const ordered = shuffle(pool, o.rng).sort((a, b) => priority(a) - priority(b));

  const out: KanaQuestion[] = [];
  for (const target of ordered) {
    if (out.length >= o.count) break;
    const dir: KanaDirection = o.direction === "mixed" ? (o.rng() < 0.5 ? "kana-to-romaji" : "romaji-to-kana") : o.direction;
    const direction = dir === "romaji-to-kana" && !unique(target) ? "kana-to-romaji" : dir;
    const sameScript = pool.filter((k) => k.script === target.script && k.char !== target.char);
    const cands = shuffle(sameScript.filter((k) => k.romaji !== target.romaji), o.rng);
    const distractors: KanaChar[] = [];
    for (const c of cands) {
      if (distractors.length >= 3) break;
      if (distractors.some((d) => d.romaji === c.romaji)) continue;
      if (direction === "romaji-to-kana" && !unique(c)) continue;
      distractors.push(c);
    }
    if (distractors.length < 3) continue;
    const texts = direction === "kana-to-romaji" ? [target.romaji, ...distractors.map((d) => d.romaji)] : [target.char, ...distractors.map((d) => d.char)];
    const options = shuffle(texts, o.rng).map((text, i) => ({ id: `o${i}`, text }));
    out.push({
      id: `kana-${out.length}`,
      direction,
      target,
      prompt: direction === "kana-to-romaji" ? target.char : target.romaji,
      options,
      correctId: options.find((x) => x.text === (direction === "kana-to-romaji" ? target.romaji : target.char))!.id,
    });
  }
  return out;
}

export { qualityFromChoice };
