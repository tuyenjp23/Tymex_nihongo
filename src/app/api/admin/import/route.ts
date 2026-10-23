import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { StoreError } from "@/lib/store/types";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { planImport, MAX_IMPORT_BYTES } from "@/lib/admin/importer";
import { loadValidationContext, sameOrigin } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  collection: z.enum(COLLECTION_KEYS),
  format: z.enum(["json", "csv"]),
  text: z.string(),
  mode: z.enum(["upsert", "create_only"]).default("upsert"),
  dryRun: z.boolean().default(true),
  /** abort: có lỗi thì không nhập gì cả (mặc định, an toàn). skip: nhập các dòng hợp lệ, bỏ dòng lỗi. */
  onError: z.enum(["abort", "skip"]).default("abort"),
});

const REPORT_LIMIT = 300;

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;
  if (!sameOrigin(req)) return Response.json({ error: "Yêu cầu bị từ chối (sai nguồn gốc)" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return Response.json({ error: "Content-Type phải là application/json" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_IMPORT_BYTES * 2) return Response.json({ error: "File quá lớn" }, { status: 413 });

  const parsedBody = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return Response.json({ error: "Yêu cầu không hợp lệ", detail: parsedBody.error.issues[0]?.message }, { status: 400 });
  const body = parsedBody.data;
  const collection: CollectionKey = body.collection;

  const store = await getStore();
  const ctx = await loadValidationContext(store);
  const existing = new Map((await store.list(collection) as unknown as { id: string }[]).map((r) => [r.id, r as unknown as Record<string, unknown>]));
  const plan = planImport({ collection, format: body.format, text: body.text, mode: body.mode, existing, ctx });
  const view = {
    counts: plan.counts,
    fileErrors: plan.fileErrors,
    // Chỉ trả các dòng lỗi (tối đa REPORT_LIMIT) + tổng số để UI gọn
    rows: plan.rows.filter((r) => r.action === "error").slice(0, REPORT_LIMIT),
    truncated: plan.counts.error > REPORT_LIMIT,
    total: plan.rows.length,
  };

  if (body.dryRun) return Response.json({ dryRun: true, ...view });

  const blocked = plan.fileErrors.length > 0 || (body.onError === "abort" && plan.counts.error > 0);
  if (blocked || plan.valid.length === 0) {
    return Response.json({ dryRun: false, imported: 0, ...view, error: plan.valid.length === 0 && !blocked ? "Không có bản ghi hợp lệ để nhập" : "Không nhập vì còn lỗi. Sửa file rồi thử lại, hoặc chọn bỏ qua dòng lỗi." }, { status: 422 });
  }
  try {
    const n = await store.upsertMany(collection, plan.valid as never, auth.actor, `Nhập ${body.format.toUpperCase()} vào ${collection}${plan.counts.error ? ` (bỏ ${plan.counts.error} dòng lỗi)` : ""}`);
    return Response.json({ dryRun: false, imported: n, ...view });
  } catch (e) {
    if (e instanceof StoreError) return Response.json({ error: e.message }, { status: e.code === "forbidden" ? 403 : 500 });
    console.error("[import]", e);
    return Response.json({ error: "Có lỗi khi ghi dữ liệu" }, { status: 500 });
  }
}
