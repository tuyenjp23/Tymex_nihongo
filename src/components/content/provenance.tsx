import type { Origin, Status } from "@/lib/types";
import type { Source } from "@/lib/schemas";
import { formatDateVi } from "@/lib/dates";
import { OriginBadge, StatusBadge } from "@/components/ui/badge";

interface Prov {
  origin: Origin;
  status: Status;
  source_id: string | null;
  source_note: string;
  reviewed_by: string | null;
  last_verified: string | null;
}

/** Hộp "Nguồn & xác minh" cho mỗi mục học liệu — để người học luôn biết nội dung đáng tin tới đâu. */
export function Provenance({ record, sources }: { record: Prov; sources: Map<string, Source> }) {
  const src = record.source_id ? sources.get(record.source_id) : null;
  const unverified = record.status !== "verified" && record.status !== "published";
  return (
    <details className="rounded-md border border-border bg-card px-3 py-2 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <StatusBadge status={record.status} />
        <OriginBadge origin={record.origin} />
        <span className="text-muted-foreground">Nguồn &amp; xác minh</span>
      </summary>
      <dl className="mt-2 grid gap-1.5 text-muted-foreground sm:grid-cols-[9rem_1fr]">
        <dt>Nguồn</dt>
        <dd className="text-foreground">
          {src ? (
            src.source_url ? (
              <a href={src.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {src.source_name}
              </a>
            ) : (
              src.source_name
            )
          ) : (
            "Chưa ghi nguồn"
          )}
        </dd>
        {record.source_note ? (
          <>
            <dt>Ghi chú</dt>
            <dd className="text-foreground">{record.source_note}</dd>
          </>
        ) : null}
        <dt>Người rà soát</dt>
        <dd className="text-foreground">{record.reviewed_by ?? "Chưa có"}</dd>
        <dt>Xác minh lần cuối</dt>
        <dd className="text-foreground">{record.last_verified ? formatDateVi(record.last_verified) : "Chưa"}</dd>
      </dl>
      {unverified ? (
        <p className="mt-2 text-xs text-warning">Nội dung này chưa được giáo viên/người bản ngữ xác minh. Hãy đối chiếu với giáo trình hoặc từ điển đáng tin cậy.</p>
      ) : null}
    </details>
  );
}
