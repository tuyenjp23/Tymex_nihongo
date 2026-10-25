import { ensureModule, getVisible } from "@/lib/content";
import { JLPT_HISTORY, JLPT_HISTORY_VERIFIED_ON, JLPT_OFFICIAL, JLPT_OFFICIAL_URLS } from "@/config/jlpt";
import { formatDateVi } from "@/lib/dates";
import { LEVELS } from "@/lib/types";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/states";
import { SeenBar } from "@/components/content/seen-bar";
import { ButtonLink } from "@/components/ui/button";
import { SceneBanner } from "@/components/art/scene-banner";
import { SCENES, type SceneId } from "@/config/japan-photos";

const LEVEL_JA: Record<string, string> = { N5: "入門", N4: "初級", N3: "中級", N2: "上級", N1: "最上級" };

export const metadata = { title: "Luyện thi JLPT" };

export default async function JlptPage() {
  await ensureModule("jlpt");
  const [vocab, kanji, grammar, questions] = await Promise.all([getVisible("vocabulary"), getVisible("kanji"), getVisible("grammar"), getVisible("questions")]);
  return (
    <>
      <PageHeader
        title="Luyện thi JLPT"
        titleJa="日本語能力試験"
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
          const nVocab = vocab.filter((v) => v.level === l).length;
          const nKanji = kanji.filter((k) => k.level === l).length;
          const nGrammar = grammar.filter((g) => g.level === l).length;
          const qCount = questions.filter((q) => q.level === l).length;
          const minutes = o.sections.reduce((s, x) => s + x.minutes, 0);
          return (
            <li key={l}>
              <Card className="nc-lift flex h-full flex-col overflow-hidden !p-0">
                <SceneBanner scene={`level-${l}` as SceneId} className="aspect-[16/7] !rounded-none" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw">
                  <div className="flex items-end justify-between gap-2">
                    <h2 className="nc-display-ja text-4xl font-bold leading-none tracking-tight">{l}</h2>
                    <span lang="ja" className="nc-display-ja text-sm text-white/85">{LEVEL_JA[l]}</span>
                  </div>
                </SceneBanner>
                <div className="flex flex-1 flex-col" style={{ padding: "var(--card-padding)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{minutes} phút thi</Badge>
                    <span className="text-xs text-muted-foreground">{SCENES[`level-${l}` as SceneId].alt}</span>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">{o.summaryVi.reading}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-border-soft py-3 text-center text-xs">
                    <div><dt className="text-muted-foreground">Từ</dt><dd className="text-lg font-bold tabular-nums">{nVocab}</dd></div>
                    <div><dt className="text-muted-foreground">Kanji</dt><dd className="text-lg font-bold tabular-nums">{nKanji}</dd></div>
                    <div><dt className="text-muted-foreground">Câu hỏi</dt><dd className="text-lg font-bold tabular-nums">{qCount}</dd></div>
                  </dl>
                  <div className="mt-3"><SeenBar level={l} total={nVocab + nKanji + nGrammar} label="Đã xem" /></div>
                  <ButtonLink href={`/jlpt/${l}`} className="mt-4">Vào cấp {l}</ButtonLink>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <section className="mt-[calc(var(--gap)*2)]" aria-labelledby="jlpt-history-title">
        <h2 id="jlpt-history-title" className="text-xl font-bold tracking-tight">JLPT qua các năm (2010–nay)</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Những thay đổi lớn của kỳ thi kể từ đợt đổi mới 2010 — kèm hai mốc nền trước đó để thấy toàn cảnh.
          App chỉ tóm tắt thông tin công khai của ban tổ chức, không đăng lại đề thi thật.
        </p>
        <ol className="mt-5 space-y-0">
          {JLPT_HISTORY.map((m, i) => (
            <li key={m.year} className="relative flex gap-4 pb-6 last:pb-0 sm:gap-6">
              {i < JLPT_HISTORY.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[2.4rem] top-12 w-px bg-border sm:left-[2.9rem]" /> : null}
              <span className="nc-display-ja z-10 grid h-12 w-[4.8rem] shrink-0 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground sm:w-[5.8rem]">{m.year}</span>
              <div className="min-w-0 pt-1">
                <h3 className="font-semibold leading-snug">{m.title}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{m.descriptionVi}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Nguồn:{" "}
                  <a className="text-primary underline" href={m.sourceUrl} target="_blank" rel="noopener noreferrer">{m.sourceLabel}</a>
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Đối chiếu ngày {formatDateVi(JLPT_HISTORY_VERIFIED_ON)} với trang JLPT chính thức (jlpt.jp) và thông báo của Japan Foundation (jpf.go.jp).
          Phần mô tả là diễn giải tiếng Việt, không phải bản dịch chính thức — hãy kiểm tra lại trên trang chính thức trước khi dùng cho việc quan trọng.
        </p>
      </section>

      <Card className="mt-[var(--gap)]">
        <CardTitle>Đề mẫu &amp; tài liệu chính thức</CardTitle>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Đề thi thật là tài liệu có bản quyền của Japan Foundation và JEES nên app không sao chép. Muốn làm thử đề chuẩn,
          hãy dùng các tài liệu do chính ban tổ chức công bố (mở trong thẻ mới):
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a className="text-primary underline" href={JLPT_OFFICIAL_URLS.samples} target="_blank" rel="noopener noreferrer">Câu hỏi mẫu chính thức cho người học</a>
            <span className="text-muted-foreground"> — bộ câu hỏi mẫu miễn phí trên trang JLPT.</span>
          </li>
          <li>
            <a className="text-primary underline" href={JLPT_OFFICIAL_URLS.workbook} target="_blank" rel="noopener noreferrer">JLPT Official Practice Workbook (2012) &amp; Vol. 2 (2018)</a>
            <span className="text-muted-foreground"> — sách luyện thi chính thức, mỗi cấp gần bằng một đề thi thật.</span>
          </li>
          <li>
            <a className="text-primary underline" href={JLPT_OFFICIAL_URLS.home} target="_blank" rel="noopener noreferrer">Trang JLPT chính thức — lịch thi &amp; đăng ký</a>
            <span className="text-muted-foreground"> — lịch thi, điểm thi và hướng dẫn đăng ký mới nhất theo từng quốc gia.</span>
          </li>
        </ul>
      </Card>
    </>
  );
}
