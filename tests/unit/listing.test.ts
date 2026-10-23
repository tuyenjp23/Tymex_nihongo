import { describe, expect, it } from "vitest";
import { filterRows, listHref, pageWindow, paginate, parseListQuery } from "@/lib/listing";
import { buildSearchIndex } from "@/lib/search";
import { buildItemLevelGroups, countByLevel, flattenItemLevels } from "@/lib/item-levels";

const row = (id: string, level: string, group: string, text: string) => ({ id, level, group, index: buildSearchIndex([text]) });

describe("parseListQuery", () => {
  it("giá trị lạ/độc hại bị loại, trang kẹp về ≥ 1", () => {
    expect(parseListQuery({})).toEqual({ q: "", level: "", group: "", page: 1 });
    expect(parseListQuery({ level: "N9", page: "-3", group: "x" }, ["a"])).toEqual({ q: "", level: "", group: "", page: 1 });
    expect(parseListQuery({ level: "N3", group: "a", page: "7", q: "  núi " }, ["a"])).toEqual({ q: "núi", level: "N3", group: "a", page: 7 });
    expect(parseListQuery({ page: "abc" }).page).toBe(1);
    expect(parseListQuery({ q: "x".repeat(500) }).q.length).toBe(100);
    expect(parseListQuery({ q: ["a", "b"], level: ["N5"] })).toMatchObject({ q: "a", level: "N5" });
  });
});

describe("filterRows / paginate", () => {
  const rows = [row("1", "N5", "food", "たべる ăn taberu eat"), row("2", "N5", "place", "やま núi yama mountain"), row("3", "N1", "food", "のむ uống nomu drink")];
  it("lọc theo cấp, nhóm và từ khóa (kể cả không dấu / romaji / tiếng Anh)", () => {
    expect(filterRows(rows, { q: "", level: "", group: "" })).toHaveLength(3);
    expect(filterRows(rows, { q: "", level: "N5", group: "" }).map((r) => r.id)).toEqual(["1", "2"]);
    expect(filterRows(rows, { q: "", level: "", group: "food" }).map((r) => r.id)).toEqual(["1", "3"]);
    expect(filterRows(rows, { q: "nui", level: "", group: "" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterRows(rows, { q: "drink", level: "N1", group: "food" }).map((r) => r.id)).toEqual(["3"]);
    expect(filterRows(rows, { q: "không có", level: "", group: "" })).toHaveLength(0);
  });
  it("phân trang đúng biên và kẹp trang vượt quá", () => {
    const nums = Array.from({ length: 100 }, (_, i) => i);
    const p1 = paginate(nums, 1, 48);
    expect(p1).toMatchObject({ page: 1, pages: 3, total: 100, from: 1, to: 48 });
    const p3 = paginate(nums, 3, 48);
    expect(p3.items).toHaveLength(4);
    expect(p3).toMatchObject({ from: 97, to: 100 });
    expect(paginate(nums, 99, 48).page).toBe(3);
    expect(paginate([], 1)).toMatchObject({ page: 1, pages: 1, total: 0, from: 0, to: 0, items: [] });
  });
});

describe("listHref / pageWindow", () => {
  it("giữ bộ lọc, bỏ giá trị rỗng, trang 1 không ghi ra", () => {
    expect(listHref("/vocabulary", { q: "núi", level: "N5", group: "", page: 3 })).toBe("/vocabulary?q=n%C3%BAi&level=N5&page=3");
    expect(listHref("/kanji", { q: "", page: 3 }, { page: 1 })).toBe("/kanji");
    expect(listHref("/kanji", { level: "N1", page: 9 }, { page: 2 })).toBe("/kanji?level=N1&page=2");
  });
  it("cửa sổ số trang rút gọn", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(10, 40)).toEqual([1, null, 8, 9, 10, 11, 12, null, 40]);
    expect(pageWindow(1, 40)).toEqual([1, 2, 3, null, 40]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});

describe("item-levels", () => {
  it("gom mã theo cấp, đếm và trải thành khóa tiến độ", () => {
    const g = buildItemLevelGroups({ vocabulary: [{ id: "a", level: "N5" }, { id: "b", level: "N1" }, { id: "x", level: "N9" }], kanji: [{ id: "k", level: "N5" }], grammar: [] });
    expect(countByLevel(g)).toEqual({ N5: 2, N4: 0, N3: 0, N2: 0, N1: 1 });
    const m = flattenItemLevels(g);
    expect(m.get("vocabulary:a")).toBe("N5");
    expect(m.get("kanji:k")).toBe("N5");
    expect(m.get("vocabulary:b")).toBe("N1");
    expect(m.has("vocabulary:x")).toBe(false);
  });
});
