import * as React from "react";
import { Ja } from "@/components/ja";

/** Văn bản bài học: đoạn cách nhau bằng dòng trống; **đậm**; chú âm {漢字|かんじ}. Không render HTML thô (an toàn XSS). */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={className ?? "nc-prose"}>
      {paras.map((p, i) => (
        <p key={i}>
          {p.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**") ? (
              <strong key={j}>
                <Ja text={chunk.slice(2, -2)} />
              </strong>
            ) : (
              <Ja key={j} text={chunk} className="" />
            ),
          )}
        </p>
      ))}
    </div>
  );
}
