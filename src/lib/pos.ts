/** Từ loại và thẻ ghi chú của JMdict, dịch sang tiếng Việt để hiển thị. Hàm thuần, dùng được ở cả server lẫn client. */

export const POS_VI: Record<string, string> = {
  n: "danh từ",
  "n-adv": "danh từ/phó từ",
  "n-t": "danh từ (thời gian)",
  "n-suf": "danh từ (hậu tố)",
  "n-pref": "danh từ (tiền tố)",
  "n-pr": "danh từ riêng",
  pn: "đại từ",
  pref: "tiền tố",
  suf: "hậu tố",
  ctr: "đơn vị đếm",
  num: "số từ",
  adv: "phó từ",
  "adv-to": "phó từ (と)",
  conj: "liên từ",
  int: "thán từ",
  prt: "trợ từ",
  exp: "cụm từ/thành ngữ",
  "adj-i": "tính từ い",
  "adj-ix": "tính từ い (いい/よい)",
  "adj-na": "tính từ な",
  "adj-no": "tính từ の",
  "adj-pn": "liên thể từ",
  "adj-t": "tính từ たる",
  "adj-f": "danh từ/động từ bổ nghĩa",
  "adj-ku": "tính từ く",
  "adj-nari": "tính từ なり",
  "aux-v": "trợ động từ",
  "aux-adj": "trợ tính từ",
  aux: "phụ từ",
  cop: "hệ từ",
  unc: "chưa phân loại",
  vs: "danh từ/する",
  "vs-i": "động từ する",
  "vs-s": "động từ する (đặc biệt)",
  vz: "động từ ずる",
  vk: "động từ bất quy tắc (来る)",
  vn: "động từ bất quy tắc (ぬ)",
  vr: "động từ bất quy tắc (り)",
  vi: "tự động từ",
  vt: "tha động từ",
  v1: "động từ nhóm 2",
  "v1-s": "động từ nhóm 2",
};

export function posLabel(tag: string): string {
  if (POS_VI[tag]) return POS_VI[tag];
  if (/^v5/.test(tag)) return "động từ nhóm 1";
  if (/^v(2|4)/.test(tag)) return "động từ cổ";
  return tag;
}

/** Từ loại hiển thị: gộp các nhãn đã dịch, bỏ trùng, tối đa 60 ký tự. */
export function posSummary(tags: string[]): string {
  const labels: string[] = [];
  for (const t of tags) {
    const l = posLabel(t);
    if (!labels.includes(l)) labels.push(l);
  }
  let out = "";
  for (const l of labels) {
    const next = out ? `${out} / ${l}` : l;
    if (next.length > 60) break;
    out = next;
  }
  return out || "chưa phân loại";
}

/** Thẻ ghi chú sắc thái/phạm vi dùng của JMdict (misc). Thẻ lạ hiển thị nguyên mã. */
export const MISC_VI: Record<string, string> = {
  uk: "thường viết bằng kana",
  pol: "lịch sự",
  hon: "tôn kính ngữ",
  hum: "khiêm nhường ngữ",
  col: "khẩu ngữ",
  fam: "thân mật",
  abbr: "viết tắt",
  arch: "cổ",
  obs: "lỗi thời",
  dated: "cũ",
  derog: "miệt thị",
  sl: "tiếng lóng",
  "net-sl": "tiếng lóng mạng",
  "on-mim": "từ tượng thanh/tượng hình",
  yoji: "thành ngữ bốn chữ",
  form: "trang trọng",
  rare: "hiếm",
  id: "thành ngữ",
  joc: "đùa",
  fem: "nữ giới hay dùng",
  male: "nam giới hay dùng",
  hist: "lịch sử",
  poet: "thơ ca",
  chn: "ngôn ngữ trẻ em",
  euph: "uyển ngữ",
  quote: "trích dẫn",
  person: "tên người",
  place: "địa danh",
};
export const miscLabel = (t: string) => MISC_VI[t] ?? t;
