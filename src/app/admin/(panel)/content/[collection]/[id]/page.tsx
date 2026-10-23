import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { COLLECTION_LABELS, recordTitle } from "@/lib/schemas";
import { loadAllRecords, loadRefOptions } from "@/lib/admin/server";
import { findUsages } from "@/lib/admin/validate";
import { formatDateTimeVi } from "@/lib/dates";
import { PageHeader } from "@/components/ui/card";
import { RecordForm } from "@/components/admin/record-form";

export default async function EditRecordPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  await requireAdmin();
  const { collection, id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  if (!(COLLECTION_KEYS as readonly string[]).includes(collection)) notFound();
  const c = collection as CollectionKey;
  const store = await getStore();
  const record = await store.get(c, id);
  if (!record) notFound();
  const [refs, all, audit] = await Promise.all([loadRefOptions(store), loadAllRecords(store), store.listAudit({ collection: c, recordId: id, limit: 5 })]);
  const usages = findUsages(c, id, all);
  const rec = record as unknown as Record<string, unknown>;
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/admin/content/${c}`} className="underline-offset-4 hover:underline">← {COLLECTION_LABELS[c].plural}</Link>}
        title={<span lang="ja">{recordTitle(c, rec) || id}</span>}
        description={`${id} · tạo ${formatDateTimeVi(String(rec.created_at))} · sửa ${formatDateTimeVi(String(rec.updated_at))}${audit[0] ? ` bởi ${audit[0].actor}` : ""}`}
      />
      {/* key theo updated_at: sau khi lưu, form được dựng lại từ dữ liệu mới nhất */}
      <RecordForm key={String(rec.updated_at)} collection={c} initial={rec} isNew={false} refs={refs} usages={usages} />
    </>
  );
}
