import Link from "next/link";
import { ensureModule, getVisible } from "@/lib/content";
import { JLPT_OFFICIAL, JLPT_OFFICIAL_URLS } from "@/config/jlpt";
import { LEVELS } from "@/lib/types";
import { itemKey } from "@/lib/progress/model";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/states";
import { SeenBar } from "@/components/content/seen-bar";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Luyện thi JLPT" };

export default async function JlptPage() {
  await ensureModule("jlpt");
  const [vocab, kanji, grammar, questions] = await Promise.all([getVisible("vocabulary"), getVisible("kanji"), getVisible("grammar"), getVisible("questions")]);
  return (
    <>
      <PageHeader
        title="Luyện thi JLPT"
        description="Chọn cấp độ để xem cấu trúc kỳ thi, luyện từng kỹ năng, làm bài kiểm tra và thi thử."
        actions={<ButtonLink href="/quiz?set=wrong&kind=practice" variant="outline">Làm lại câu sai</ButtonLink>}
      />
      <Alert tone="warning" title="Câu hỏi trong app không phải đề thi chính thức" className="mb-[var(--gap)]">
        Các câu hỏi do AI soạn để luyện tập và đang chờ giáo viên rà soát. App không sao chép đề thi thật.{" "}
        <a className="underline" href={JLPT_OFFICIAL_URLS.samples} target="_blank" rel="noopener noreferrer">Câu hỏi mẫu chính thức</a> có tại trang JLPT.
      </Alert>
      <ul className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((l) => {
          const o = JLPT_OFFICIAL[l];
          const keys = [
            ...vocab.filter((v) => v.level === l).map((v) => itemKey("vocabulary", v.id)),
            ...kanji.filter((k) => k.level === l).map((k) => itemKey("kanji", k.id)),
            ...grammar.filter((g) => g.level === l).map((g) => itemKey("grammar", g.id)),
          ];
          const qCount = questions.filter((q) => q.level === l).length;
          const minutes = o.sections.reduce((s, x) => s + x.minutes, 0);
          return (
            <li key={l}>
              <Card className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <CardTitle as="h2" className="text-3xl font-bold text-primary">{l}</CardTitle>
                  <Badge>{minutes} phút thi</Badge>
                </div>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{o.summaryVi.reading}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><dt className="text-muted-foreground">Từ</dt><dd className="text-lg font-bold tabular-nums">{vocab.filter((v) => v.level === l).length}</dd></div>
                  <div><dt className="text-muted-foreground">Kanji</dt><dd className="text-lg font-bold tabular-nums">{kanji.filter((k) => k.level === l).length}</dd></div>
                  <div><dt className="text-muted-foreground">Câu hỏi</dt><dd className="text-lg font-bold tabular-nums">{qCount}</dd></div>
                </dl>
                <div className="mt-3"><SeenBar keys={keys} label="Đã xem" /></div>
                <Link href={`/jlpt/${l}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Vào cấp {l}
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
