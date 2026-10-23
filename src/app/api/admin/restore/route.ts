import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { StoreError } from "@/lib/store/types";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { MAX_RESTORE_BYTES, planRestore, type RestorePlan } from "@/lib/admin/restore";
import { loadValidationContext, sameOrigin } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ text: z.string(), dryRun: z.boolean().default(true) });
const ROW_REPORT_LIMIT = 100;

function view(plan: RestorePlan) {
  return {
    fileErrors: plan.fileErrors,
    totals: plan.totals,
    ok: plan.ok,
    collections: plan.collections.map((c) => ({
      collection: c.collection,
      total: c.total,
      counts: c.counts,
      errorRows: c.errorRows.slice(0, ROW_REPORT_LIMIT),
      truncated: c.errorRows.length > ROW_REPORT_LIMIT,
    })),
    settings: plan.settings.map((s) => ({ key: s.key, status: s.status, errors: s.errors })),
  };
}

/**
 * POST /api/admin/restore  { text, dryRun }
 * Khôi phục toàn bộ từ file "Sao lưu toàn bộ". Chạy thử không ghi gì. Nhập thật chỉ chạy khi KHÔNG còn lỗi nào (tất cả hoặc không gì).
 * Ghi theo từng phần (từng loại nội dung, rồi cấu hình): nếu giữa chừng gặp lỗi lưu trữ, phần đã ghi vẫn còn — chạy lại là an toàn vì ghi theo ID.
 */
export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;
  if (!sameOrigin(req)) return Response.json({ error: "Yêu cầu bị từ chối (sai nguồn gốc)" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return Response.json({ error: "Content-Type phải là application/json" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_RESTORE_BYTES * 2) return Response.json({ error: "File quá lớn" }, { status: 413 });

  const parsedBody = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  const { text, dryRun } = parsedBody.data;

  const store = await getStore();
  const ctx = await loadValidationContext(store);
  const existing: Partial<Record<CollectionKey, Map<string, Record<string, unknown>>>> = {};
  for (const c of COLLECTION_KEYS) existing[c] = new Map(((await store.list(c)) as unknown as { id: string }[]).map((r) => [r.id, r as unknown as Record<string, unknown>]));

  const plan = planRestore({ text, existing, ctx });
  if (dryRun) return Response.json({ dryRun: true, ...view(plan) });
  if (!plan.ok) {
    return Response.json({ dryRun: false, applied: [], ...view(plan), error: "Không khôi phục vì còn lỗi. Sửa file (hoặc loại bỏ phần lỗi) rồi chạy thử lại." }, { status: 422 });
  }

  const applied: string[] = [];
  const actor = { ...auth.actor, label: `${auth.actor.label} (khôi phục sao lưu)` };
  try {
    for (const c of plan.collections) {
      if (c.valid.length === 0) continue;
      await store.upsertMany(c.collection, c.valid as never, actor, "Khôi phục từ bản sao lưu toàn bộ");
      applied.push(c.collection);
    }
    for (const s of plan.settings) {
      if (s.status !== "apply") continue;
      await store.saveSetting(s.key, s.value, actor);
      applied.push(`settings/${s.key}`);
    }
  } catch (e) {
    const msg = e instanceof StoreError ? e.message : "Có lỗi khi ghi dữ liệu";
    if (!(e instanceof StoreError)) console.error("[restore]", e);
    return Response.json({ dryRun: false, applied, ...view(plan), error: `${msg}. Đã ghi: ${applied.join(", ") || "chưa có gì"}. Chạy lại khôi phục là an toàn (ghi theo ID).` }, { status: e instanceof StoreError && e.code === "forbidden" ? 403 : 500 });
  }
  return Response.json({ dryRun: false, applied, ...view(plan) });
}
