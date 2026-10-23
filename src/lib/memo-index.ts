import { buildSearchIndex, withRomaji } from "./search";
import { searchEnglish } from "./vocab-meaning";
import { topicLabel } from "@/config/topics";
import type { Kanji, Sentence, Vocabulary } from "./schemas";

/**
 * Chuỗi tìm kiếm được tính MỘT lần cho mỗi bản ghi (WeakMap theo đối tượng).
 * Dữ liệu nhập sẵn nằm trong bộ nhớ của tiến trình (BaseLayer) nên cùng một đối tượng được dùng lại giữa các request →
 * không phải chuẩn hóa/romaji hóa hàng nghìn mục mỗi lần có người tìm kiếm. Bản ghi bị sửa là đối tượng mới nên tự được tính lại.
 */
function memo<T extends object>(build: (r: T) => string): (r: T) => string {
  const cache = new WeakMap<T, string>();
  return (r) => {
    let v = cache.get(r);
    if (v === undefined) {
      v = build(r);
      cache.set(r, v);
    }
    return v;
  };
}

export const vocabIndex = memo<Vocabulary>((v) =>
  buildSearchIndex([v.word, v.reading, withRomaji(v.reading), v.meaning_vi, searchEnglish(v), ...(v.alt_forms ?? []), ...(v.alt_readings ?? []), ...(v.alt_readings ?? []).map(withRomaji), v.pos, topicLabel(v.topic), ...v.tags]),
);

export const kanjiIndex = memo<Kanji>((k) =>
  buildSearchIndex([
    k.char, k.han_viet, k.meaning_vi, searchEnglish(k), ...k.onyomi, ...k.kunyomi,
    ...k.onyomi.map(withRomaji), ...k.kunyomi.map(withRomaji),
    ...k.compounds.flatMap((c) => [c.word, c.reading, c.meaning_vi]),
  ]),
);

export const sentenceIndex = memo<Sentence>((s) => buildSearchIndex([s.ja, ...(s.translations ?? []).map((t) => t.text)]));
