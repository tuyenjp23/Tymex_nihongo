import { isDue } from "../srs";
import { unresolvedWrongIds, type Progress } from "../progress/model";

/**
 * Các mục "cần chú ý" cho Daily Review (chỉ từ vựng/Kanji):
 *  1) đến hạn ôn (SM-2);  2) gắn với câu hỏi đang làm sai;  3) hay quên (lapses ≥ 1) hoặc độ dễ thấp (< 2.0).
 * Trả về khóa không trùng, theo thứ tự ưu tiên trên.
 */
export function dailyFocusKeys(p: Progress, today: string, questionRefs: Record<string, string>): string[] {
  const ok = (k: string) => k.startsWith("vocabulary:") || k.startsWith("kanji:");
  const out: string[] = [];
  const add = (k: string) => {
    if (ok(k) && !out.includes(k)) out.push(k);
  };
  for (const [k, s] of Object.entries(p.srs)) if (isDue(s, today)) add(k);
  for (const qid of unresolvedWrongIds(p)) {
    const ref = questionRefs[qid];
    if (ref) add(ref);
  }
  for (const [k, s] of Object.entries(p.srs)) if (s.lapses >= 1 || s.ease < 2.0) add(k);
  return out;
}
