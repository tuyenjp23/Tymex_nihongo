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
    // Chỉ sao lưu phần nằm trong kho (nội dung bạn thêm/sửa). Dữ liệu nhập sẵn (content/imported) đã nằm trong mã nguồn/GitHub, không đưa vào đây.
    for (const c of COLLECTION_KEYS) collections[c] = await (store.listOwn ? store.listOwn(c) : store.list(c));
    const settings: Record<string, unknown> = {};
    for (const k of SETTING_KEYS) settings[k] = (await store.getSetting(k))?.value ?? null;
    return new Response(JSON.stringify({ app: "nihongo-compass", format: 1, exported_at: new Date().toISOString(), excludes_imported_base: !!store.listOwn, collections, settings }, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nihongo-compass-backup-${stamp}.json"`, "Cache-Control": "no-store" },
    });
  }

  if (!(COLLECTION_KEYS as readonly string[]).includes(collection)) return Response.json({ error: "Loại nội dung không hợp lệ" }, { status: 400 });
  const c = collection as CollectionKey;
  const own = url.searchParams.get("scope") === "own";
  const rows = (await (own && store.listOwn ? store.listOwn(c) : store.list(c))) as unknown as Record<string, unknown>[];
  // Vercel giới hạn phản hồi ~4,5 MB: danh sách quá lớn (vd. toàn bộ từ vựng nhập sẵn) phải xuất theo phần của riêng bạn.
  if (store.mode === "supabase" && rows.length > 5000) {
    return Response.json({ error: `Danh sách có ${rows.length} bản ghi, quá lớn để tải qua website. Thêm "&scope=own" để tải phần bạn đã thêm/sửa, hoặc dùng lệnh import:translate-export trên máy.` }, { status: 413 });
  }
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
