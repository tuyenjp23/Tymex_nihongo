import { describe, expect, it } from "vitest";
import { KANA_GROUPS, buildKanaQuiz, kanaFor, kanaPool } from "@/lib/kana-table";
import { mulberry32 } from "@/lib/rng";
import { emptyProgress, mergeProgress, parseProgress, reviewKana } from "@/lib/progress/model";
import { toRomaji } from "@/lib/kana";

const cells = (id: string) => KANA_GROUPS.find((g) => g.id === id)!.rows.flatMap((r) => r.cells).filter((c): c is string => !!c);

describe("bảng kana", () => {
  it("đủ số chữ: 46 cơ bản, 25 âm đục/bán đục, 33 âm ghép", () => {
    expect(cells("basic")).toHaveLength(46);
    expect(cells("dakuten")).toHaveLength(25);
    expect(cells("yoon")).toHaveLength(33);
  });
  it("không có chữ trùng trong cùng bảng; mỗi hàng đúng số cột", () => {
    const all = KANA_GROUPS.flatMap((g) => cells(g.id));
    expect(new Set(all).size).toBe(all.length);
    for (const g of KANA_GROUPS) for (const r of g.rows) expect(r.cells, `${g.id}/${r.label}`).toHaveLength(g.cols.length);
  });
  it("hiragana ↔ katakana ↔ romaji khớp các chữ đã biết", () => {
    expect(kanaFor("あ", "katakana", "basic")).toMatchObject({ char: "ア", romaji: "a" });
    expect(kanaFor("し", "katakana", "basic")).toMatchObject({ char: "シ", romaji: "shi" });
    expect(kanaFor("を", "hiragana", "basic").romaji).toBe("o");
    expect(kanaFor("きょ", "katakana", "yoon")).toMatchObject({ char: "キョ", romaji: "kyo" });
    expect(kanaFor("ぱ", "katakana", "dakuten").char).toBe("パ");
  });
  it("romaji của mọi chữ không rỗng, chỉ gồm a–z, và nhất quán với toRomaji", () => {
    for (const k of kanaPool(["basic", "dakuten", "yoon"], ["hiragana", "katakana"])) {
      expect(k.romaji, k.char).toMatch(/^[a-z]+$/);
      expect(k.romaji).toBe(toRomaji(k.hiragana));
    }
  });
  it("kanaPool lọc theo nhóm và bảng chữ", () => {
    expect(kanaPool(["basic"], ["hiragana"])).toHaveLength(46);
    expect(kanaPool(["basic", "dakuten"], ["hiragana", "katakana"])).toHaveLength(142);
    expect(kanaPool([], ["hiragana"])).toEqual([]);
  });
});

describe("bài luyện kana", () => {
  const pool = kanaPool(["basic", "dakuten", "yoon"], ["hiragana", "katakana"]);
  it("mỗi câu có 4 phương án khác nhau, đáp án đúng nằm trong đó và là đáp án DUY NHẤT hợp lệ", () => {
    for (const dir of ["kana-to-romaji", "romaji-to-kana", "mixed"] as const) {
      const qs = buildKanaQuiz(pool, { count: 60, direction: dir, rng: mulberry32(3) });
      expect(qs.length).toBe(60);
      for (const q of qs) {
        expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
        expect(q.options.some((o) => o.id === q.correctId)).toBe(true);
        const correct = q.options.find((o) => o.id === q.correctId)!.text;
        if (q.direction === "kana-to-romaji") expect(correct).toBe(q.target.romaji);
        else {
          expect(correct).toBe(q.target.char);
          // không có chữ kana nào khác trong cùng bảng chữ cũng đọc là romaji này
          const same = pool.filter((k) => k.script === q.target.script && k.romaji === q.target.romaji);
          expect(same, q.target.char).toHaveLength(1);
          // mọi phương án nhiễu đều có romaji khác
          for (const o of q.options) if (o.text !== q.target.char) expect(pool.find((k) => k.char === o.text)!.romaji).not.toBe(q.target.romaji);
        }
      }
    }
  });
  it("romaji→kana không bao giờ hỏi じ/ぢ/ず/づ (trùng âm)", () => {
    const qs = buildKanaQuiz(kanaPool(["dakuten"], ["hiragana"]), { count: 25, direction: "romaji-to-kana", rng: mulberry32(5) });
    for (const q of qs) if (q.direction === "romaji-to-kana") expect(["じ", "ぢ", "ず", "づ"]).not.toContain(q.target.char);
  });
  it("ưu tiên chữ đến hạn, rồi chữ chưa luyện, và chữ ôn xong chưa đến hạn đứng sau cùng", () => {
    const today = "2026-10-22";
    let p = emptyProgress();
    p = reviewKana(p, "あ", 4, "2026-09-01"); // đến hạn
    p = reviewKana(p, "い", 5, today); // chưa đến hạn
    p = reviewKana(p, "い", 5, today);
    const qs = buildKanaQuiz(kanaPool(["basic"], ["hiragana"]), { count: 46, direction: "kana-to-romaji", rng: mulberry32(1), progress: p.kana, today });
    const order = qs.map((q) => q.target.char);
    expect(order[0]).toBe("あ");
    expect(order[order.length - 1]).toBe("い");
  });
  it("cùng seed → cùng bài; ít chữ quá thì không tạo câu hỏi", () => {
    const a = buildKanaQuiz(pool, { count: 10, direction: "mixed", rng: mulberry32(9) }).map((q) => q.prompt + q.options.map((o) => o.text).join());
    const b = buildKanaQuiz(pool, { count: 10, direction: "mixed", rng: mulberry32(9) }).map((q) => q.prompt + q.options.map((o) => o.text).join());
    expect(a).toEqual(b);
    expect(buildKanaQuiz(pool.slice(0, 3), { count: 10, direction: "mixed", rng: mulberry32(1) })).toEqual([]);
  });
});

describe("tiến độ kana", () => {
  it("dữ liệu tiến độ cũ (không có trường kana) vẫn đọc được", () => {
    const old: Record<string, unknown> = { ...emptyProgress() };
    delete old.kana;
    const r = parseProgress(old);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.kana).toEqual({});
  });
  it("reviewKana lưu riêng với srs, và gộp hai thiết bị không mất chữ nào", () => {
    const a = reviewKana(emptyProgress("2026-10-01T00:00:00Z"), "あ", 4, "2026-10-10");
    const b = reviewKana(emptyProgress("2026-10-02T00:00:00Z"), "ア", 4, "2026-10-11");
    expect(Object.keys(a.srs)).toEqual([]);
    const m = mergeProgress(a, b);
    expect(Object.keys(m.kana).sort()).toEqual(["ア", "あ"].sort());
    expect(parseProgress(m).ok).toBe(true);
  });
});
