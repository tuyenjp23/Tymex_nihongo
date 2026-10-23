import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import { Ja } from "@/components/ja";
import { SpeakButton } from "@/components/content/speak-button";
import { Card, CardTitle } from "@/components/ui/card";
import { Figure } from "@/components/content/figure";
import type { ImageAsset } from "@/lib/schemas";

export function LevelNote() {
  return (
    <p className="mb-4 text-xs text-muted-foreground">
      Cấp độ N5–N1 hiển thị trong app là <strong>gợi ý</strong> — kỳ thi JLPT hiện không công bố danh sách từ vựng/Kanji/ngữ pháp chính thức theo cấp.
    </p>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function ExampleList({ examples }: { examples: { ja: string; vi: string }[] }) {
  if (examples.length === 0) return null;
  return (
    <ul className="space-y-3">
      {examples.map((e, i) => (
        <li key={i} className="flex items-start gap-3">
          <SpeakButton text={e.ja} label="Nghe câu ví dụ" className="mt-1" />
          <div>
            <Ja text={e.ja} romaji className="text-lg" as="p" />
            <p className="text-sm text-muted-foreground">{e.vi}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <Card aria-labelledby={id}>
      <CardTitle id={id} className="mb-3">{title}</CardTitle>
      {children}
    </Card>
  );
}

/** Hình + chú thích nguồn (để người học thấy hình tự vẽ hay lấy từ đâu). */
export function IllustrationFigure({ image, className }: { image: ImageAsset; className?: string }) {
  return (
    <figure className={className}>
      <Figure src={image.path} alt={image.alt_vi} className="h-40 w-40 sm:h-48 sm:w-48" />
      <figcaption className="mt-1 max-w-[12rem] text-[11px] leading-snug text-muted-foreground">
        {image.attribution || image.source_name}
      </figcaption>
    </figure>
  );
}
