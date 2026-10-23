import Link from "next/link";
import { notFound } from "next/navigation";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { COLLECTION_LABELS } from "@/lib/schemas";
import { blankRecord, ID_PREFIX } from "@/lib/admin/field-specs";
import { loadRefOptions } from "@/lib/admin/server";
import { PageHeader } from "@/components/ui/card";
import { RecordForm } from "@/components/admin/record-form";

export default async function NewRecordPage({ params }: { params: Promise<{ collection: string }> }) {
  await requireAdmin();
  const { collection } = await params;
  if (!(COLLECTION_KEYS as readonly string[]).includes(collection)) notFound();
  const c = collection as CollectionKey;
  const store = await getStore();
  const refs = await loadRefOptions(store);
  const initial = blankRecord(c, `${ID_PREFIX[c]}-${randomBytes(3).toString("hex")}`);
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/admin/content/${c}`} className="underline-offset-4 hover:underline">← {COLLECTION_LABELS[c].plural}</Link>}
        title={`Thêm ${COLLECTION_LABELS[c].singular.toLowerCase()}`}
        description='Nội dung mới mặc định là "tự biên soạn – bản nháp". Đổi sang "Đã xác minh" chỉ khi một người thật đã kiểm tra.'
      />
      <RecordForm collection={c} initial={initial} isNew refs={refs} />
    </>
  );
}
