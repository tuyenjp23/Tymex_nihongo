import { getDataMode } from "@/lib/store/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/admin/server";
import { validateProgressPayload } from "@/lib/progress/sync";

export const dynamic = "force-dynamic";

/**
 * Đồng bộ tiến độ học của CHÍNH người đang đăng nhập (chỉ chế độ Supabase).
 * Quyền truy cập do RLS quyết định (user_id = auth.uid()); route này không dùng service_role.
 */
async function authed() {
  if (getDataMode() !== "supabase") return { error: Response.json({ error: "Đồng bộ chỉ có ở chế độ Supabase" }, { status: 501 }) };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: Response.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  return { supabase, userId: data.user.id };
}

export async function GET() {
  const a = await authed();
  if ("error" in a) return a.error;
  const { data, error } = await a.supabase.from("user_progress").select("data,updated_at").eq("user_id", a.userId).maybeSingle();
  if (error) return Response.json({ error: "Không đọc được tiến độ" }, { status: 500 });
  return Response.json({ progress: data?.data ?? null, updated_at: data?.updated_at ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const a = await authed();
  if ("error" in a) return a.error;
  if (!sameOrigin(req)) return Response.json({ error: "Yêu cầu bị từ chối (sai nguồn gốc)" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return Response.json({ error: "Content-Type phải là application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const v = validateProgressPayload(body);
  if (!v.ok) return Response.json({ error: v.error }, { status: v.status });
  const { error } = await a.supabase
    .from("user_progress")
    .upsert({ user_id: a.userId, data: v.value, client_updated_at: v.value.updatedAt, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: "Không lưu được tiến độ" }, { status: 500 });
  return Response.json({ ok: true });
}
