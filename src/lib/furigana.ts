/**
 * Chú âm (furigana) viết dạng {漢字|かんじ}. Ví dụ: "{山|やま}が{高|たか}い。"
 * Cách này giữ dữ liệu là chuỗi thuần → dễ nhập trong Admin, import/export CSV/JSON, và hiển thị bằng <ruby>.
 */
export interface RubySegment {
  text: string;
  /** Có giá trị khi đoạn này cần chú âm */
  ruby?: string;
}

const RUBY_RE = /\{([^|{}]+)\|([^{}]*)\}/g;

export function parseRuby(input: string): RubySegment[] {
  const out: RubySegment[] = [];
  let last = 0;
  for (const m of input.matchAll(RUBY_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: input.slice(last, idx) });
    out.push({ text: m[1], ruby: m[2] });
    last = idx + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}

/** Văn bản thuần (bỏ chú âm): "{山|やま}" → "山" */
export function stripRuby(input: string): string {
  return input.replace(RUBY_RE, "$1");
}

/** Cách đọc kana của cả câu: chú âm nếu có, còn lại giữ nguyên: "{山|やま}が" → "やまが" */
export function rubyToReading(input: string): string {
  return input.replace(RUBY_RE, "$2");
}

/** Kiểm tra cú pháp: có dấu { } mất cân bằng hay chú âm rỗng không. Trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateRubyMarkup(input: string): string[] {
  const errors: string[] = [];
  const stripped = input.replace(RUBY_RE, "");
  if (/[{}|]/.test(stripped)) errors.push("Cú pháp chú âm sai: dùng {漢字|かんじ}, không để sót { } hoặc |");
  for (const m of input.matchAll(RUBY_RE)) {
    if (!m[2].trim()) errors.push(`Chú âm rỗng cho "${m[1]}"`);
  }
  return errors;
}
