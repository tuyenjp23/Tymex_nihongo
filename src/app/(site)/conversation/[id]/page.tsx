import { notFound } from "next/navigation";
import { ensureModule, getSourcesMap, getVisibleById } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { Badge, LevelBadge } from "@/components/ui/badge";
import { Ja } from "@/components/ja";
import { Provenance } from "@/components/content/provenance";
import { BackLink, Section } from "@/components/content/bits";
import { Dialogue } from "@/components/conversation/dialogue";
import { Drills } from "@/components/conversation/drills";
import { Roleplay } from "@/components/conversation/roleplay";
import { Tabs } from "@/components/ui/tabs";
import { SpeakButton } from "@/components/content/speak-button";
import { CONVERSATION_CATEGORY_LABELS } from "@/lib/types";
import { POLITENESS_LABELS } from "@/lib/schemas";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getVisibleById("conversations", id);
  return { title: c ? c.title : "Hội thoại" };
}

export default async function ConversationDetail({ params }: { params: Promise<{ id: string }> }) {
  await ensureModule("conversation");
  const { id } = await params;
  const c = await getVisibleById("conversations", id);
  if (!c) notFound();
  const sources = await getSourcesMap();

  const tabs = [
    {
      id: "dialogue",
      label: "Hội thoại",
      content: (
        <div className="space-y-[var(--gap)]">
          <Section title="Tình huống" id="ctx">
            <p>{c.context}</p>
            <p className="mt-2 text-sm"><strong>Mục tiêu:</strong> {c.goal}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {c.characters.map((ch) => (
                <li key={ch.name} className="rounded-md bg-muted px-2.5 py-1 text-sm">
                  <Ja text={ch.name} /> <span className="text-muted-foreground">— {ch.role}</span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Hội thoại" id="dlg">
            <Dialogue lines={c.lines} characters={c.characters} />
          </Section>
        </div>
      ),
    },
    {
      id: "notes",
      label: "Từ & ngữ pháp",
      content: (
        <div className="space-y-[var(--gap)]">
          {c.vocab_notes.length > 0 ? (
            <Section title="Từ vựng đáng chú ý" id="vn">
              <ul className="divide-y divide-border">
                {c.vocab_notes.map((v, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                    <Ja text={v.reading ? `{${v.term}|${v.reading}}` : v.term} className="text-lg" />
                    <span className="text-sm text-muted-foreground">{v.meaning_vi}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {c.grammar_notes.length > 0 ? (
            <Section title="Ngữ pháp trong hội thoại" id="gn">
              <ul className="space-y-2">
                {c.grammar_notes.map((g, i) => (
                  <li key={i}>
                    <Ja text={g.pattern} className="font-medium" as="p" />
                    <p className="text-sm text-muted-foreground">{g.note_vi}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {c.alternatives.length > 0 ? (
            <Section title="Cách nói khác" id="alt">
              <ul className="space-y-3">
                {c.alternatives.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <SpeakButton text={a.ja} className="mt-1" />
                    <div>
                      <Ja text={a.ja} romaji className="text-lg" as="p" />
                      <p className="text-sm">{a.vi}</p>
                      {a.nuance_vi ? <p className="text-sm text-muted-foreground">{a.nuance_vi}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {c.other_situations.length > 0 ? (
            <Section title="Dùng trong tình huống khác" id="os">
              <ul className="space-y-3">
                {c.other_situations.map((s, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium">{s.situation_vi}</p>
                    <Ja text={s.ja} romaji as="p" className="text-lg" />
                    <p className="text-sm text-muted-foreground">{s.vi}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      ),
    },
    ...(c.roleplay.length > 0 ? [{ id: "roleplay", label: "Nhập vai", content: <Roleplay turns={c.roleplay} /> }] : []),
    ...(c.drills.length > 0 ? [{ id: "drills", label: "Luyện phản xạ", content: <Section title="Luyện phản xạ" id="dr"><Drills drills={c.drills} /></Section> }] : []),
  ];

  return (
    <>
      <BackLink href="/conversation">Giao tiếp thực tế</BackLink>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <LevelBadge level={c.level_hint} />
            <Badge>{CONVERSATION_CATEGORY_LABELS[c.category]}</Badge>
            <Badge>{POLITENESS_LABELS[c.politeness]}</Badge>
          </span>
        }
        title={c.title}
      />
      <Tabs tabs={tabs} />
      {c.references.length > 0 ? (
        <ul className="mt-4 text-sm text-muted-foreground">
          {c.references.map((r) => (
            <li key={r.url || r.title}>
              Tham khảo: {r.url ? <a className="text-primary underline" href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-[var(--gap)]">
        <Provenance record={c} sources={sources} />
      </div>
    </>
  );
}
