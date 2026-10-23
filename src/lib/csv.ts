/** CSV theo RFC 4180: dấu phẩy, ngoặc kép bao ô có dấu phẩy/xuống dòng, "" là ngoặc kép thoát. */

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
  // Chống "CSV injection" khi mở bằng Excel: ô bắt đầu bằng = + - @ bị coi là công thức.
  const safe = /^[=+@]/.test(s) || (/^-/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.map(csvEscape).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvEscape(r[c])).join(","));
  // BOM để Excel đọc đúng UTF-8 tiếng Nhật/Việt
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Phân tích CSV → mảng object theo dòng tiêu đề. Trả lỗi nếu số cột không khớp hoặc ngoặc kép không đóng. */
export function parseCsv(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const src = text.replace(/^﻿/, "");
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const errors: string[] = [];

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      table.push(row);
      row = [];
    } else cell += ch;
  }
  if (inQuotes) errors.push("Ngoặc kép không được đóng ở cuối file");
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    table.push(row);
  }

  const nonEmpty = table.filter((r) => !(r.length === 1 && r[0].trim() === ""));
  if (nonEmpty.length === 0) return { rows: [], errors: [...errors, "File CSV rỗng"] };
  const header = nonEmpty[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const r = nonEmpty[i];
    if (r.length !== header.length) {
      errors.push(`Dòng ${i + 1}: có ${r.length} cột, cần ${header.length}`);
      continue;
    }
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      // Bỏ dấu ' thêm vào để chống công thức khi xuất
      obj[h] = r[idx].replace(/^'(?=[=+@-])/, "");
    });
    rows.push(obj);
  }
  return { rows, errors };
}
