import { describe, expect, it } from "vitest";
import { parseRuby, rubyToReading, stripRuby, validateRubyMarkup } from "@/lib/furigana";
import { hiraganaToKatakana, katakanaToHiragana, normalizeForSearch, toRomaji } from "@/lib/kana";
import { FLASHCARD_QUALITY, isDue, memoryStage, newSrsState, qualityFromChoice, sm2, MIN_EASE } from "@/lib/srs";
import { computeStreak } from "@/lib/streak";
import { mockTimeLimitSeconds, scoreAnswers, summarizeBySection, type AnswerRecord } from "@/lib/scoring";
import { addDays, daysBetween, formatDateVi, todayString } from "@/lib/dates";
import { csvEscape, parseCsv, toCsv } from "@/lib/csv";
import { buildSearchIndex, highlightRanges, matchesQuery, withRomaji } from "@/lib/search";
import { mulberry32, pickN, shuffle } from "@/lib/rng";
import { JLPT_OFFICIAL } from "@/config/jlpt";

describe("furigana {漢字|かんじ}", () => {
  it("tách đoạn có chú âm và đoạn thường", () => {
    expect(parseRuby("{山|やま}が{高|たか}い")).toEqual([
      { text: "山", ruby: "やま" },
      { text: "が" },
      { text: "高", ruby: "たか" },
      { text: "い" },
    ]);
  });
  it("chuỗi không có chú âm giữ nguyên, chuỗi rỗng ra mảng rỗng", () => {
    expect(parseRuby("ありがとう")).toEqual([{ text: "ありがとう" }]);
    expect(parseRuby("")).toEqual([]);
  });
  it("stripRuby / rubyToReading", () => {
    expect(stripRuby("{山|やま}が{高|たか}い")).toBe("山が高い");
    expect(rubyToReading("{山|やま}が{高|たか}い")).toBe("やまがたかい");
  });
  it("validateRubyMarkup bắt lỗi cú pháp và chú âm rỗng", () => {
    expect(validateRubyMarkup("{山|やま}が高い")).toEqual([]);
    expect(validateRubyMarkup("{山|やま")).not.toEqual([]);
    expect(validateRubyMarkup("{山|}")[0]).toMatch(/rỗng/);
    expect(validateRubyMarkup("山|やま")).not.toEqual([]);
  });
});

describe("kana & romaji", () => {
  it.each([
    ["やま", "yama"],
    ["ラーメン", "raamen"],
    ["がっこう", "gakkou"],
    ["きって", "kitte"],
    ["まっちゃ", "matcha"],
    ["しんいち", "shin'ichi"],
    ["ちゃ", "cha"],
    ["ふぁ", "fa"],
    ["東京", "東京"],
  ])("toRomaji(%s) = %s", (kana, romaji) => {
    expect(toRomaji(kana)).toBe(romaji);
  });
  it("đổi qua lại hiragana/katakana", () => {
    expect(katakanaToHiragana("カタカナ")).toBe("かたかな");
    expect(hiraganaToKatakana("ひらがな")).toBe("ヒラガナ");
  });
  it("normalizeForSearch bỏ dấu tiếng Việt, đổi đ, gộp khoảng trắng, katakana→hiragana", () => {
    expect(normalizeForSearch("  Núi   Đà ")).toBe("nui da");
    expect(normalizeForSearch("カタカナ")).toBe("かたかな");
    expect(normalizeForSearch("ＡＢＣ")).toBe("abc");
  });
});

describe("tìm kiếm", () => {
  const idx = buildSearchIndex(["{山|やま}", "やま", "núi", withRomaji("やま")]);
  it("khớp Kanji, kana, tiếng Việt có/không dấu và romaji", () => {
    for (const q of ["山", "やま", "ヤマ", "núi", "nui", "yama", "NUI yama"]) expect(matchesQuery(idx, q), q).toBe(true);
    expect(matchesQuery(idx, "sông")).toBe(false);
    expect(matchesQuery(idx, "nui song")).toBe(false);
    expect(matchesQuery(idx, "   ")).toBe(true);
  });
  it("highlightRanges ghép lại đúng văn bản gốc và đánh dấu phần khớp", () => {
    const r = highlightRanges("Núi Phú Sĩ", "phu");
    expect(r.map((x) => x.text).join("")).toBe("Núi Phú Sĩ");
    expect(highlightRanges("abc", "")).toEqual([{ text: "abc", match: false }]);
    expect(highlightRanges("banana", "an").filter((x) => x.match).map((x) => x.text)).toEqual(["anan"]); // hai lần khớp liền nhau gộp thành một đoạn
  });
});

describe("SM-2", () => {
  const T = "2026-10-22";
  it("chuỗi trả lời tốt: 1 → 6 → round(6×2.5)=15 ngày", () => {
    let s = newSrsState(T);
    s = sm2(s, 4, T);
    expect([s.reps, s.interval, s.ease, s.due]).toEqual([1, 1, 2.5, "2026-10-23"]);
    s = sm2(s, 4, "2026-10-23");
    expect([s.reps, s.interval]).toEqual([2, 6]);
    s = sm2(s, 4, "2026-10-29");
    expect([s.reps, s.interval, s.due]).toEqual([3, 15, "2026-11-13"]);
  });
  it("điều chỉnh ease: q=5 +0.1, q=3 −0.14, q<3 −0.2 và đặt lại", () => {
    const base = { ...newSrsState(T), reps: 2, interval: 6 };
    expect(sm2(base, 5, T).ease).toBe(2.6);
    expect(sm2(base, 3, T).ease).toBe(2.36);
    const fail = sm2(base, 1, T);
    expect([fail.ease, fail.reps, fail.interval, fail.lapses, fail.due]).toEqual([2.3, 0, 1, 1, "2026-10-23"]);
  });
  it("ease không bao giờ xuống dưới mức sàn 1.3", () => {
    let s = newSrsState(T);
    for (let i = 0; i < 30; i++) s = sm2(s, 0, T);
    expect(s.ease).toBe(MIN_EASE);
    expect(s.lapses).toBe(30);
  });
  it("chất lượng ngoài khoảng được kẹp về 0..5", () => {
    expect(sm2(newSrsState(T), 99, T).reps).toBe(1);
    expect(sm2(newSrsState(T), -5, T).lapses).toBe(1);
  });
  it("trắc nghiệm không bao giờ cho q=5; sai = 1; nhanh = 4; chậm = 3", () => {
    expect(qualityFromChoice(false, 100)).toBe(1);
    expect(qualityFromChoice(true, 1000)).toBe(4);
    expect(qualityFromChoice(true, 9000)).toBe(3);
    expect(FLASHCARD_QUALITY.easy).toBe(5);
  });
  it("giai đoạn ghi nhớ và đến hạn", () => {
    expect(memoryStage(undefined)).toBe("new");
    expect(memoryStage(newSrsState(T))).toBe("new");
    const learning = sm2(newSrsState(T), 4, T);
    expect(memoryStage(learning)).toBe("learning");
    expect(memoryStage({ ...learning, interval: 8 })).toBe("review");
    expect(memoryStage({ ...learning, interval: 21 })).toBe("mastered");
    expect(isDue(learning, "2026-10-22")).toBe(false);
    expect(isDue(learning, "2026-10-23")).toBe(true);
    expect(isDue(newSrsState(T), T)).toBe(false);
    expect(isDue(undefined, T)).toBe(false);
  });
});

describe("chuỗi ngày học", () => {
  const T = "2026-10-22";
  it("không có dữ liệu", () => {
    expect(computeStreak([], T)).toMatchObject({ current: 0, longest: 0, alive: false });
  });
  it("học liên tiếp, kể cả hôm nay", () => {
    expect(computeStreak(["2026-10-20", "2026-10-21", "2026-10-22"], T)).toMatchObject({ current: 3, alive: true, studiedToday: true, usingRestDay: false });
  });
  it("nghỉ 1 ngày không làm đứt chuỗi; nghỉ 2 ngày liên tiếp thì đứt", () => {
    expect(computeStreak(["2026-10-19", "2026-10-21"], "2026-10-21").current).toBe(2);
    expect(computeStreak(["2026-10-17", "2026-10-21"], "2026-10-21")).toMatchObject({ current: 1, longest: 1 });
  });
  it("hôm nay chưa học nhưng còn ngày nghỉ được phép", () => {
    expect(computeStreak(["2026-10-20"], T)).toMatchObject({ alive: true, usingRestDay: true, studiedToday: false, current: 1 });
    expect(computeStreak(["2026-10-19"], T)).toMatchObject({ alive: false, current: 0, longest: 1 });
  });
  it("longest giữ lại chuỗi dài nhất đã đứt; ngày trùng được gộp", () => {
    const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-10-21", "2026-10-21"];
    expect(computeStreak(days, T)).toMatchObject({ longest: 4, current: 1 });
  });
  it("restDays=0: nghỉ một ngày là đứt", () => {
    expect(computeStreak(["2026-10-20", "2026-10-22"], T, 0).current).toBe(1);
  });
});

describe("chấm điểm", () => {
  const rec = (id: string, skill: AnswerRecord["skill"], chosen: string | null, correct: boolean): AnswerRecord => ({ questionId: id, skill, chosenOptionId: chosen, correct });
  it("tính tổng, theo kỹ năng, câu sai và câu bỏ trống", () => {
    const s = scoreAnswers([rec("1", "vocabulary", "a", true), rec("2", "vocabulary", "b", false), rec("3", "grammar", null, false), rec("4", "reading", "c", true)]);
    expect(s).toMatchObject({ correct: 2, total: 4, ratio: 0.5, wrongIds: ["2", "3"], unansweredIds: ["3"] });
    expect(s.bySkill.vocabulary).toEqual({ correct: 1, total: 2 });
  });
  it("trả lời lại cùng câu: chỉ tính lần cuối (không cộng đôi)", () => {
    const s = scoreAnswers([rec("1", "kanji", "a", false), rec("1", "kanji", "b", true)]);
    expect(s).toMatchObject({ correct: 1, total: 1, ratio: 1, wrongIds: [] });
  });
  it("bài rỗng không chia cho 0", () => {
    expect(scoreAnswers([])).toMatchObject({ total: 0, ratio: 0 });
  });
  it("summarizeBySection chỉ trả tỉ lệ thô theo phần chấm điểm của cấp, không quy đổi điểm", () => {
    const by = { vocabulary: { correct: 3, total: 4 }, grammar: { correct: 1, total: 2 } };
    const res = summarizeBySection("N5", by);
    expect(res.length).toBe(JLPT_OFFICIAL.N5.scoring.length);
    for (const r of res) {
      expect(Object.keys(r).sort()).toEqual(["correct", "id", "name", "ratio", "total"]);
      if (r.total === 0) expect(r.ratio).toBeNull();
      else expect(r.ratio).toBeCloseTo(r.correct / r.total);
    }
    expect(res.reduce((a, r) => a + r.total, 0)).toBe(6);
  });
  it("thời gian thi thử có sàn 60 giây", () => {
    expect(mockTimeLimitSeconds(1)).toBe(60);
    expect(mockTimeLimitSeconds(20)).toBe(1200);
    expect(mockTimeLimitSeconds(0)).toBe(60);
  });
});

describe("ngày tháng", () => {
  it("todayString theo múi giờ Nhật", () => {
    expect(todayString(new Date("2026-10-22T16:00:00Z"))).toBe("2026-10-23");
    expect(todayString(new Date("2026-10-22T14:59:00Z"))).toBe("2026-10-22");
  });
  it("addDays qua tháng, năm nhuận; daysBetween", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-01", "2026-10-22")).toBe(21);
    expect(daysBetween("2026-10-22", "2026-10-01")).toBe(-21);
    expect(formatDateVi("2026-10-22")).toBe("22/10/2026");
  });
});

describe("CSV", () => {
  it("round-trip với dấu phẩy, ngoặc kép, xuống dòng, tiếng Nhật", () => {
    const rows = [
      { a: "山,やま", b: 'nói "xin chào"', c: "dòng 1\ndòng 2" },
      { a: "", b: "日本語", c: "x" },
    ];
    const text = toCsv(rows, ["a", "b", "c"]);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const back = parseCsv(text);
    expect(back.errors).toEqual([]);
    expect(back.rows).toEqual(rows);
  });
  it("chống CSV injection khi xuất và phục hồi nguyên văn khi nhập", () => {
    expect(csvEscape("=1+1")).toBe("'=1+1");
    expect(csvEscape("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvEscape("-cmd")).toBe("'-cmd");
    expect(csvEscape("-5")).toBe("-5");
    expect(csvEscape("-5.5")).toBe("-5.5");
    const back = parseCsv(toCsv([{ x: "=HYPERLINK(1)" }], ["x"]));
    expect(back.rows[0].x).toBe("=HYPERLINK(1)");
  });
  it("đối tượng/mảng được ghi dạng JSON; null/undefined thành ô rỗng", () => {
    expect(csvEscape([1, 2])).toBe('"[1,2]"');
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
  it("báo lỗi: số cột sai, ngoặc kép không đóng, file rỗng", () => {
    expect(parseCsv("a,b\n1").errors[0]).toMatch(/có 1 cột, cần 2/);
    expect(parseCsv('a\n"abc').errors.join()).toMatch(/Ngoặc kép/);
    expect(parseCsv("").errors[0]).toMatch(/rỗng/);
  });
  it("chấp nhận CRLF và dòng cuối không có xuống dòng", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4").rows).toEqual([{ a: "1", b: "2" }, { a: "3", b: "4" }]);
  });
});

describe("rng", () => {
  it("cùng seed → cùng kết quả; shuffle không mất phần tử và không sửa mảng gốc", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], mulberry32(7));
    const b = shuffle([1, 2, 3, 4, 5, 6], mulberry32(7));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    const src = [1, 2, 3];
    shuffle(src, mulberry32(1));
    expect(src).toEqual([1, 2, 3]);
  });
  it("pickN lấy đúng số lượng, không trùng, không vượt quá kích thước mảng", () => {
    const r = pickN([1, 2, 3, 4, 5], 3, mulberry32(3));
    expect(new Set(r).size).toBe(3);
    expect(pickN([1, 2], 5, mulberry32(3)).length).toBe(2);
  });
});
