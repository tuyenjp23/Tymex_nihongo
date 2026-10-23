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
import { MACHINE_VI_NOTE, hasVietnamese, isMachineVietnamese, meaningText } from "@/lib/vocab-meaning";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = await getVisibleById("kanji", id);
  return { title: k ? `${k.char} — ${k.han_viet}` : "Kanji" };
}

export default async function KanjiDetail({ params }: { params: Promise<{ id: string }> }) {
  await ensureModule("kanji");
  const { id } = await params;
  const k = await getVisibleById("kanji", id);
  if (!k) notFound();
  const [images, sources, vocab] = await Promise.all([getImagesMap(), getSourcesMap(), getVisible("vocabulary")]);
  const img = k.image_id ? images.get(k.image_id) : undefined;
  const related = vocab.filter((v) => v.word.includes(k.char)).slice(0, 8);

  return (
    <>
      <MarkSeen itemKey={itemKey("kanji", k.id)} />
      <BackLink href="/kanji">Kanji</BackLink>
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><LevelBadge level={k.level} /></span>}
        title={
          <span className="flex flex-wrap items-center gap-4">
            <span className="jp-kanji" lang="ja">{k.char}</span>
            <span>
              <span className="block text-2xl">{k.han_viet}</span>
              <span className="block text-base font-normal text-muted-foreground">{meaningText(k)}</span>
              {isMachineVietnamese(k) ? <span className="block text-xs text-warning">{MACHINE_VI_NOTE}</span> : null}
              {!hasVietnamese(k) ? <span className="block text-xs text-muted-foreground">Chưa có nghĩa tiếng Việt — hiển thị nghĩa gốc tiếng Anh (KANJIDIC2).</span> : null}
            </span>
          </span>
        }
      />

      <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_16rem]">
        <div className="space-y-[var(--gap)]">
          <Section title="Cách đọc" id="readings">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="mb-1 text-sm font-medium text-muted-foreground">On&rsquo;yomi (音読み)</dt>
                <dd className="flex flex-wrap gap-2">
                  {k.onyomi.length === 0 ? <span className="text-sm text-muted-foreground">Không có trong dữ liệu</span> : null}
                  {k.onyomi.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      <Ja text={r} />
                      <Romaji reading={r} className="nc-romaji-inline" />
                      <SpeakButton text={r} className="h-7 w-7" label={`Nghe ${r}`} />
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-sm font-medium text-muted-foreground">Kun&rsquo;yomi (訓読み)</dt>
                <dd className="flex flex-wrap gap-2">
                  {k.kunyomi.length === 0 ? <span className="text-sm text-muted-foreground">Không có trong dữ liệu</span> : null}
                  {k.kunyomi.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      <Ja text={r} />
                      <Romaji reading={r} className="nc-romaji-inline" />
                      <SpeakButton text={r.replace(/[.\-]/g, "")} className="h-7 w-7" label={`Nghe ${r}`} />
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            {k.reading_note ? <p className="mt-3 text-sm text-muted-foreground">{k.reading_note}</p> : null}
            {(k.meanings_en ?? []).length > 0 || k.grade || k.stroke_count ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {(k.meanings_en ?? []).length > 0 ? <>Nghĩa gốc (English): {k.meanings_en!.join("; ")}. </> : null}
                {k.stroke_count ? <>Số nét: {k.stroke_count}. </> : null}
                {k.grade ? <>Lớp học (Nhật): {k.grade >= 8 ? "trung học/thường dùng" : k.grade}. </> : null}
              </p>
            ) : null}
            {k.radical ? <p className="mt-2 text-sm">Bộ thủ: <Badge>{k.radical}</Badge></p> : null}
          </Section>

          {k.compounds.length > 0 ? (
            <Section title="Từ ghép" id="compounds">
              <ul className="divide-y divide-border">
                {k.compounds.map((c) => (
                  <li key={c.word} className="flex items-center gap-3 py-2">
                    <SpeakButton text={c.reading} className="h-8 w-8" label={`Nghe ${c.word}`} />
                    <Ja text={`{${c.word}|${c.reading}}`} className="text-lg" />
                    <span className="text-sm text-muted-foreground">{c.meaning_vi}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {k.examples.length > 0 ? (
            <Section title="Ví dụ" id="examples">
              <ExampleList examples={k.examples} />
            </Section>
          ) : null}

          {related.length > 0 ? (
            <Section title="Từ vựng có chứa chữ này" id="related">
              <ul className="flex flex-wrap gap-2">
                {related.map((v) => (
                  <li key={v.id}>
                    <Link href={`/vocabulary/${v.id}`} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                      <span className="jp">{v.word}</span>
                      <span className="text-muted-foreground">{meaningText(v)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {k.level_source && sources.get(k.level_source) ? (
            <p className="text-xs text-muted-foreground">Cấp {k.level} theo <a className="text-primary underline" href={sources.get(k.level_source)!.source_url} target="_blank" rel="noopener noreferrer">{sources.get(k.level_source)!.source_name}</a> — danh sách cộng đồng, không phải danh sách chính thức của JLPT.</p>
          ) : null}
          <Provenance record={k} sources={sources} />
          {k.source_id && sources.get(k.source_id)?.attribution_required ? (
            <p className="text-xs text-muted-foreground">{sources.get(k.source_id)!.attribution_text} <Link href="/sources#ghi-cong" className="text-primary underline">Xem ghi công đầy đủ</Link></p>
          ) : null}
        </div>
        {img ? (
          <aside aria-label="Hình minh họa">
            <IllustrationFigure image={img} />
          </aside>
        ) : null}
      </div>
    </>
  );
}
