import { notFound } from "next/navigation";
import { ensureModule, getSourcesMap, getVisibleById } from "@/lib/content";
import { PageHeader } from "@/components/ui/card";
import { LevelBadge } from "@/components/ui/badge";
import { Ja } from "@/components/ja";
import { Provenance } from "@/components/content/provenance";
import { MarkSeen } from "@/components/content/mark-seen";
import { BackLink, ExampleList, Section } from "@/components/content/bits";
import { Alert } from "@/components/ui/states";
import { itemKey } from "@/lib/progress/model";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await getVisibleById("grammar", id);
  return { title: g ? g.title.replace(/\{([^|}]+)\|[^}]*\}/g, "$1") : "Ngữ pháp" };
}

export default async function GrammarDetail({ params }: { params: Promise<{ id: string }> }) {
  await ensureModule("grammar");
  const { id } = await params;
  const g = await getVisibleById("grammar", id);
  if (!g) notFound();
  const sources = await getSourcesMap();
  return (
    <>
      <MarkSeen itemKey={itemKey("grammar", g.id)} />
      <BackLink href="/grammar">Ngữ pháp</BackLink>
      <PageHeader
        eyebrow={<LevelBadge level={g.level} />}
        title={<Ja text={g.title} />}
        description={g.meaning_vi}
      />
      <div className="space-y-[var(--gap)]">
        <Section title="Cấu trúc" id="structure">
          <Ja text={g.structure} className="text-xl" as="p" />
          {g.formation ? <p className="mt-2 text-sm text-muted-foreground">{g.formation}</p> : null}
        </Section>
        {g.usage ? (
          <Section title="Cách dùng" id="usage">
            <p className="nc-prose">{g.usage}</p>
          </Section>
        ) : null}
        <Section title="Ví dụ" id="examples">
          <ExampleList examples={g.examples} />
        </Section>
        {g.comparisons.length > 0 ? (
          <Section title="So sánh với mẫu dễ nhầm" id="comparisons">
            <ul className="space-y-3">
              {g.comparisons.map((c, i) => (
                <li key={i}>
                  <p className="font-medium"><Ja text={c.target} /></p>
                  <p className="text-sm text-muted-foreground">{c.note_vi}</p>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
        {g.common_mistakes.length > 0 ? (
          <Section title="Lỗi thường gặp" id="mistakes">
            <div className="space-y-2">
              {g.common_mistakes.map((m, i) => (
                <Alert key={i} tone="warning">
                  <Ja text={m} />
                </Alert>
              ))}
            </div>
          </Section>
        ) : null}
        <Provenance record={g} sources={sources} />
      </div>
    </>
  );
}
