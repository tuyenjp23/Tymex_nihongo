import { requireAdminApi } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { csvColumns } from "@/lib/admin/field-specs";
import { toCsv } from "@/lib/csv";
import { SETTING_KEYS } from "@/lib/settings-schemas";
import { todayString } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** GET /api/admin/export?collection=vocabulary|all&format=json|csv  (cần đăng nhập admin) */
export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;
  const url = new URL(req.url);
  const collection = url.searchParams.get("collection") ?? "";
  const format = url.searchParams.get("format") ?? "json";
  const store = await getStore();
  const stamp = todayString();

  if (collection === "all") {
    if (format !== "json") return Response.json({ error: "Bản sao lưu toàn bộ chỉ có định dạng JSON" }, { status: 400 });
    const collections: Record<string, unknown[]> = {};
    for (const c of COLLECTION_KEYS) collections[c] = await store.list(c);
    const settings: Record<string, unknown> = {};
    for (const k of SETTING_KEYS) settings[k] = (await store.getSetting(k))?.value ?? null;
    return new Response(JSON.stringify({ app: "nihongo-compass", format: 1, exported_at: new Date().toISOString(), collections, settings }, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nihongo-compass-backup-${stamp}.json"`, "Cache-Control": "no-store" },
    });
  }

  if (!(COLLECTION_KEYS as readonly string[]).includes(collection)) return Response.json({ error: "Loại nội dung không hợp lệ" }, { status: 400 });
  const c = collection as CollectionKey;
  const rows = (await store.list(c)) as unknown as Record<string, unknown>[];
  if (format === "csv") {
    return new Response(toCsv(rows, csvColumns(c)), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${c}-${stamp}.csv"`, "Cache-Control": "no-store" },
    });
  }
  if (format !== "json") return Response.json({ error: "Định dạng phải là json hoặc csv" }, { status: 400 });
  return new Response(JSON.stringify(rows, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${c}-${stamp}.json"`, "Cache-Control": "no-store" },
  });
}
