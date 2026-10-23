import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureModule, getImagesMap, getSourcesMap, getVisible, getVisibleById } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Badge, LevelBadge } from "@/components/ui/badge";
import { Ja, Romaji } from "@/components/ja";
import { SpeakButton } from "@/components/content/speak-button";
import { Provenance } from "@/components/content/provenance";
import { MarkSeen } from "@/components/content/mark-seen";
import { BackLink, ExampleList, IllustrationFigure, Section } from "@/components/content/bits";
import { itemKey } from "@/lib/progress/model";
import { topicLabel } from "@/config/topics";
import { SentenceList } from "@/components/content/sentence-list";
import { MACHINE_VI_NOTE, hasVietnamese, isMachineVietnamese, meaningText } from "@/lib/vocab-meaning";
import { miscLabel, posLabel } from "@/lib/pos";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getVisibleById("vocabulary", id);
  return { title: v ? `${v.word} — ${meaningText(v)}` : "Từ vựng" };
}

export default async function VocabularyDetail({ params }: { params: Promise<{ id: string }> }) {
  await ensureModule("vocabulary");
  const { id } = await params;
  const v = await getVisibleById("vocabulary", id);
  if (!v) notFound();
  const [images, sources, kanji, allVocab, allSentences] = await Promise.all([getImagesMap(), getSourcesMap(), getVisible("kanji"), getVisible("vocabulary"), getVisible("sentences")]);
  const img = v.image_id ? images.get(v.image_id) : undefined;
  const kanjiInWord = kanji.filter((k) => v.word.includes(k.char));
  const senses = v.senses ?? [];
  const altForms = v.alt_forms ?? [];
  const altReadings = v.alt_readings ?? [];
  const sentences = allSentences.filter((x) => (x.word_refs ?? []).includes(v.id)).slice(0, 6);
  const levelSrc = v.level_source ? sources.get(v.level_source) : undefined;
  const attributionSources = [v.source_id, v.level_source].filter((x): x is string => !!x).map((id) => sources.get(id)).filter((x) => x && x.attribution_required && x.attribution_text);
  const sameTopic = allVocab.filter((x) => x.topic === v.topic && x.id !== v.id).slice(0, 6);

  return (
    <>
      <MarkSeen itemKey={itemKey("vocabulary", v.id)} />
      <BackLink href="/vocabulary">Từ vựng</BackLink>
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><LevelBadge level={v.level} /><Badge>{topicLabel(v.topic)}</Badge>{v.pos ? <Badge>{v.pos}</Badge> : null}</span>}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Ja text={v.word === v.reading ? v.word : `{${v.word}|${v.reading}}`} className="jp-xl" />
            <SpeakButton text={v.reading} label="Nghe từ này" />
          </span>
        }
        description={
          <span>
            <Ja text={v.reading} className="text-lg" /> <Romaji reading={v.reading} className="nc-romaji-inline" />
          </span>
        }
      />

      <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_16rem]">
        <div className="space-y-[var(--gap)]">
          <Section title={hasVietnamese(v) ? "Nghĩa tiếng Việt" : "Nghĩa (chưa có tiếng Việt)"} id="meaning">
            <p className="text-xl font-semibold">{hasVietnamese(v) ? v.meaning_vi : meaningText(v).replace(/^EN: /, "")}</p>
            {isMachineVietnamese(v) ? <p className="mt-1 text-sm text-warning">{MACHINE_VI_NOTE}</p> : null}
            {!hasVietnamese(v) ? <p className="mt-1 text-sm text-muted-foreground">Mục này nhập từ từ điển mở chỉ có nghĩa tiếng Anh; chưa có bản tiếng Việt.</p> : null}
            {v.note ? <p className="mt-2 text-sm text-muted-foreground">{v.note}</p> : null}
            {altForms.length > 0 || altReadings.length > 0 ? (
              <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[9rem_1fr]">
                {altForms.length > 0 ? (<><dt className="text-muted-foreground">Cách viết khác</dt><dd lang="ja" className="jp">{altForms.join("、")}</dd></>) : null}
                {altReadings.length > 0 ? (<><dt className="text-muted-foreground">Cách đọc khác</dt><dd lang="ja" className="jp">{altReadings.join("、")}</dd></>) : null}
              </dl>
            ) : null}
            {!v.imageable ? (
              <p className="mt-2 text-xs text-muted-foreground">Đây là từ trừu tượng nên app không gán một hình duy nhất để tránh hiểu sai nghĩa.</p>
            ) : null}
          </Section>
          {senses.length > 0 ? (
            <Section title={`Các nghĩa gốc (${senses.length})`} id="senses">
              <ol className="list-decimal space-y-3 pl-5">
                {senses.map((s, i) => (
                  <li key={i}>
                    <p>{(s.glosses ?? []).map((g) => g.text).join("; ")} <span className="text-xs text-muted-foreground">({[...new Set((s.glosses ?? []).map((g) => g.lang))].join(", ")})</span></p>
                    {s.gloss_vi ? <p className="text-sm">{s.gloss_vi}</p> : null}
                    <p className="mt-0.5 flex flex-wrap gap-1.5">
                      {(s.pos ?? []).map((p) => <Badge key={p}>{posLabel(p)}</Badge>)}
                      {(s.misc ?? []).map((m) => <Badge key={m} tone="warning">{miscLabel(m)}</Badge>)}
                    </p>
                    {(s.info ?? []).length > 0 ? <p className="text-xs text-muted-foreground">{s.info!.join("; ")}</p> : null}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">Nghĩa gốc từ từ điển JMdict (tiếng Anh) — mỗi mục có thể có nhiều nghĩa và nhiều cách đọc.</p>
            </Section>
          ) : null}
          {v.examples.length > 0 ? (
            <Section title="Ví dụ" id="examples">
              <ExampleList examples={v.examples} />
            </Section>
          ) : null}
          {sentences.length > 0 ? (
            <Section title={`Câu ví dụ (${sentences.length})`} id="sentences">
              <SentenceList sentences={sentences} />
            </Section>
          ) : null}
          {kanjiInWord.length > 0 ? (
            <Section title="Kanji trong từ này" id="kanji">
              <ul className="flex flex-wrap gap-2">
                {kanjiInWord.map((k) => (
                  <li key={k.id}>
                    <Link href={`/kanji/${k.id}`} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-muted">
                      <span className="jp text-2xl">{k.char}</span>
                      <span className="text-sm">{k.han_viet}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {sameTopic.length > 0 ? (
            <Section title={`Cùng chủ đề: ${topicLabel(v.topic)}`} id="related">
              <ul className="flex flex-wrap gap-2">
                {sameTopic.map((x) => (
                  <li key={x.id}>
                    <Link href={`/vocabulary/${x.id}`} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                      <span className="jp">{x.word}</span>
                      <span className="text-muted-foreground">{meaningText(x)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {levelSrc ? (
            <p className="text-xs text-muted-foreground">Cấp {v.level} theo <a className="text-primary underline" href={levelSrc.source_url} target="_blank" rel="noopener noreferrer">{levelSrc.source_name}</a> — danh sách cộng đồng, không phải danh sách chính thức của JLPT.</p>
          ) : null}
          <Provenance record={v} sources={sources} />
          {attributionSources.length > 0 ? (
            <p className="text-xs text-muted-foreground">{attributionSources.map((x) => x!.attribution_text).join(" ")} <Link href="/sources#ghi-cong" className="text-primary underline">Xem ghi công đầy đủ</Link></p>
          ) : null}
        </div>
        {img ? (
          <aside aria-label="Hình minh họa">
            <IllustrationFigure image={img} />
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Giấy phép hình</summary>
              <p className="mt-1">{img.license_note}</p>
            </details>
          </aside>
        ) : null}
      </div>
    </>
  );
}
