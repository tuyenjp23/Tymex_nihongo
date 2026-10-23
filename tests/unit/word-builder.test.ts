import { describe, expect, it } from "vitest";
import { applyHint, buildWordBuilder, checkArrangement, tokenizeKana, wbQuality, wbScore, wordBuilderEligible } from "@/lib/games/word-builder";
import { mulberry32 } from "@/lib/rng";
import type { GameItem } from "@/lib/games/types";

const mk = (id: string, reading: string, over: Partial<GameItem> = {}): GameItem => ({
  key: `vocabulary#${id}`, type: "vocabulary", level: "N5", topic: "x", text: reading, reading, meaning: `nghĩa ${id}`, imageable: false, ...over,
});

describe("tokenizeKana", () => {
  it("ghép chữ nhỏ vào chữ đứng trước, giữ っ và ー riêng", () => {
    expect(tokenizeKana("がっこう")).toEqual(["が", "っ", "こ", "う"]);
    expect(tokenizeKana("きょう")).toEqual(["きょ", "う"]);
    expect(tokenizeKana("ラーメン")).toEqual(["ラ", "ー", "メ", "ン"]);
    expect(tokenizeKana("パーティー")).toEqual(["パ", "ー", "ティ", "ー"]);
    expect(tokenizeKana("しゅくだい")).toEqual(["しゅ", "く", "だ", "い"]);
  });
  it("chuỗi rỗng → mảng rỗng", () => expect(tokenizeKana("")).toEqual([]));
});

describe("wordBuilderEligible", () => {
  it("chỉ lấy từ vựng có cách đọc kana thuần, 2–6 mảnh", () => {
    const items = [mk("a", "やま"), mk("b", "き"), mk("c", "とうきょうだいがく"), mk("d", "ABC"), mk("e", "たべる"), mk("f", "あ・い")];
    const kanji = mk("k", "やま", { type: "kanji", key: "kanji#k" });
    expect(wordBuilderEligible([...items, kanji]).map((i) => i.key)).toEqual(["vocabulary#a", "vocabulary#e"]);
  });
});

describe("buildWordBuilder", () => {
  const items = ["やま", "かわ", "たべる", "のみもの", "がっこう", "ラーメン", "きょう", "おみず"].map((r, i) => mk(String(i), r));
  it("tạo đủ số câu, mảnh nhiễu không trùng mảnh của đáp án, tái lập được theo seed", () => {
    const a = buildWordBuilder(items, { count: 6 }, mulberry32(7));
    const b = buildWordBuilder(items, { count: 6 }, mulberry32(7));
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    for (const p of a) {
      const ans = p.tiles.filter((t) => !t.decoy).map((t) => t.text).sort();
      expect(ans).toEqual([...p.answer].sort());
      const decoys = p.tiles.filter((t) => t.decoy).map((t) => t.text);
      expect(decoys.length).toBeGreaterThanOrEqual(1);
      expect(decoys.length).toBeLessThanOrEqual(2);
      for (const d of decoys) expect(p.answer).not.toContain(d);
      expect(new Set(p.tiles.map((t) => t.id)).size).toBe(p.tiles.length);
    }
  });
  it("katakana chỉ nhận mảnh nhiễu katakana", () => {
    const [p] = buildWordBuilder(items, { count: 1, targetKeys: ["vocabulary#5"] }, mulberry32(3));
    expect(p.answer).toEqual(["ラ", "ー", "メ", "ン"]);
    for (const t of p.tiles.filter((x) => x.decoy)) expect(/[ァ-ヺ]/.test(t.text)).toBe(true);
  });
  it("lọc theo cấp độ", () => {
    const mixed = [mk("1", "やま"), mk("2", "かわ", { level: "N4" })];
    expect(buildWordBuilder(mixed, { count: 5, levels: ["N4"] }, mulberry32(1)).map((p) => p.itemKey)).toEqual(["vocabulary#2"]);
  });
});

describe("checkArrangement / applyHint", () => {
  const [p] = buildWordBuilder([mk("1", "ききます")], { count: 1 }, mulberry32(5));
  const idsFor = (texts: string[]) => {
    const used: string[] = [];
    return texts.map((t) => { const id = p.tiles.find((x) => x.text === t && !used.includes(x.id))!.id; used.push(id); return id; });
  };
  it("hai mảnh cùng chữ dùng thay nhau được", () => {
    expect(checkArrangement(p, idsFor(["き", "き", "ま", "す"]))).toBe(true);
    const ids = idsFor(["き", "き", "ま", "す"]);
    expect(checkArrangement(p, [ids[1], ids[0], ids[2], ids[3]])).toBe(true);
  });
  it("sai thứ tự hoặc thiếu mảnh → sai", () => {
    expect(checkArrangement(p, idsFor(["き", "ま", "き", "す"]))).toBe(false);
    expect(checkArrangement(p, idsFor(["き", "き", "ま"]))).toBe(false);
  });
  it("gợi ý giữ phần đúng ở đầu, bỏ phần sai và thêm đúng một mảnh", () => {
    const wrong = idsFor(["き", "ま", "き"]);
    const h1 = applyHint(p, wrong)!;
    expect(h1.map((id) => p.tiles.find((t) => t.id === id)!.text)).toEqual(["き", "き"]);
    const h2 = applyHint(p, h1)!;
    expect(h2).toHaveLength(3);
    const h3 = applyHint(p, h2)!;
    expect(checkArrangement(p, h3)).toBe(true);
    expect(applyHint(p, h3)).toBeNull();
    expect(applyHint(p, [])).toHaveLength(1);
  });
});

describe("điểm và chất lượng SM-2", () => {
  it("gợi ý và lỗi làm giảm điểm và chất lượng; xem đáp án = 0 điểm", () => {
    expect(wbScore({ wrong: 0, hints: 0, revealed: false })).toBe(10);
    expect(wbScore({ wrong: 1, hints: 1, revealed: false })).toBe(5);
    expect(wbScore({ wrong: 9, hints: 9, revealed: false })).toBe(0);
    expect(wbScore({ wrong: 0, hints: 0, revealed: true })).toBe(0);
    expect(wbQuality({ wrong: 0, hints: 0, revealed: false })).toBe(4);
    expect(wbQuality({ wrong: 0, hints: 1, revealed: false })).toBe(3);
    expect(wbQuality({ wrong: 2, hints: 1, revealed: false })).toBe(2);
    expect(wbQuality({ wrong: 0, hints: 0, revealed: true })).toBe(1);
  });
});
