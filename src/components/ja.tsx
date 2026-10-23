import * as React from "react";
import { parseRuby, rubyToReading } from "@/lib/furigana";
import { toRomaji } from "@/lib/kana";
import { cn } from "@/lib/utils";

/**
 * Hiển thị chuỗi tiếng Nhật có chú âm dạng {漢字|かんじ} bằng <ruby>.
 * Việc ẩn/hiện furigana do thuộc tính data-furigana trên <html> điều khiển (CSS), nên component này dùng được
 * ở cả Server và Client Component, không gây lệch hydrate.
 * `romaji`: thêm dòng romaji (hiện khi người học bật "Romaji" trên thanh trên cùng).
 */
export function Ja({
  text,
  className,
  romaji = false,
  as: As = "span",
}: {
  text: string;
  className?: string;
  romaji?: boolean;
  as?: "span" | "p" | "div";
}) {
  const segs = parseRuby(text);
  return (
    <As className={cn("jp", className)} lang="ja">
      {segs.map((s, i) =>
        s.ruby ? (
          <ruby key={i}>
            {s.text}
            <rp>(</rp>
            <rt>{s.ruby}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        ),
      )}
      {romaji ? <span className="nc-romaji">{toRomaji(rubyToReading(text))}</span> : null}
    </As>
  );
}

/** Dòng romaji độc lập cho một cách đọc kana (chỉ hiện khi bật Romaji). */
export function Romaji({ reading, className }: { reading: string; className?: string }) {
  return <span className={cn("nc-romaji", className)}>{toRomaji(reading)}</span>;
}
