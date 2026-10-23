/** Tiện ích Kana/Romaji/chuẩn hóa văn bản tìm kiếm. */

export function katakanaToHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function hiraganaToKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

const BASE: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "o", ん: "n",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ゔ: "vu",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
};

const DIGRAPH: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  ぢゃ: "ja", ぢゅ: "ju", ぢょ: "jo",
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo",
  てぃ: "ti", でぃ: "di", うぃ: "wi", うぇ: "we", うぉ: "wo",
  じぇ: "je", しぇ: "she", ちぇ: "che", ゔぁ: "va", ゔぃ: "vi", ゔぇ: "ve", ゔぉ: "vo",
};

/**
 * Kana → Romaji (Hepburn đơn giản). Giữ nguyên ký tự không phải kana (Kanji, dấu câu).
 * Trường âm "ー" → lặp nguyên âm trước đó (ラーメン → raamen). っ → nhân đôi phụ âm. ん trước nguyên âm/y → n'.
 */
export function toRomaji(input: string): string {
  const s = katakanaToHiragana(input);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "っ") {
      const next = DIGRAPH[s.slice(i + 1, i + 3)] ?? BASE[s[i + 1]] ?? "";
      out += next ? (next.startsWith("ch") ? "t" : next[0]) : "";
      continue;
    }
    if (ch === "ー") {
      const v = out.match(/[aiueo]$/)?.[0];
      if (v) out += v;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (DIGRAPH[two]) {
      out += DIGRAPH[two];
      i++;
      continue;
    }
    if (ch === "ん") {
      const next = BASE[s[i + 1]] ?? "";
      out += /^[aiueoy]/.test(next) || (s[i + 1] === "や" || s[i + 1] === "ゆ" || s[i + 1] === "よ") ? "n'" : "n";
      continue;
    }
    out += BASE[ch] ?? ch;
  }
  return out;
}

/** Chuẩn hóa để tìm kiếm: NFKC, bỏ dấu tiếng Việt, katakana→hiragana, chữ thường, gộp khoảng trắng. */
export function normalizeForSearch(s: string): string {
  return katakanaToHiragana(
    s
      .normalize("NFKC")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/g, "d"),
  )
    .replace(/\s+/g, " ")
    .trim();
}
