import { Ja } from "@/components/ja";
import { SpeakButton } from "@/components/content/speak-button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import type { Sentence } from "@/lib/schemas";

const KIND_NOTE: Record<string, string> = {
  source: "bản dịch của nguồn",
  machine_translated: "dịch máy, chưa kiểm tra",
  authored: "do người biên soạn dịch",
};
const LANG_LABEL: Record<string, string> = { vi: "Tiếng Việt", en: "English" };

/**
 * Câu ví dụ từ kho "sentences" (dùng chung cho mọi module). Mỗi câu hiển thị rõ: ngôn ngữ + loại bản dịch (dịch máy/nguồn),
 * trạng thái xác minh và dòng ghi công + liên kết về nguồn gốc — câu nhập từ nguồn ngoài không bao giờ trông như "chính thức".
 */
export function SentenceList({ sentences }: { sentences: Sentence[] }) {
  if (sentences.length === 0) return null;
  return (
    <ul className="space-y-4">
      {sentences.map((s) => {
        const tr = [...(s.translations ?? [])].sort((a, b) => (a.lang === "vi" ? -1 : 0) - (b.lang === "vi" ? -1 : 0));
        const verified = s.status === "verified" || s.status === "published";
        return (
          <li key={s.id} className="flex items-start gap-3">
            <SpeakButton text={s.ja} label="Nghe câu ví dụ" className="mt-1" />
            <div className="min-w-0">
              <Ja text={s.ja} romaji className="text-lg" as="p" />
              {tr.map((t, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  <span lang={t.lang}>{t.text}</span>{" "}
                  <span className="text-xs">({LANG_LABEL[t.lang] ?? t.lang}, {KIND_NOTE[t.kind] ?? t.kind})</span>
                </p>
              ))}
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {!verified ? <StatusBadge status={s.status} /> : null}
                {s.level && s.level_source ? <Badge>{s.level} (theo nguồn)</Badge> : null}
                {s.attribution ? <span>{s.attribution}</span> : null}
                {s.source_url ? (
                  <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Xem câu gốc
                  </a>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
