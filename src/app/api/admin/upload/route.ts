import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { requireAdminApi } from "@/lib/auth/admin";
import { getDataMode } from "@/lib/store/mode";
import { getDataDir } from "@/lib/store";
import { sameOrigin } from "@/lib/admin/server";
import { sniffImage } from "@/lib/admin/upload";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;
  if (!sameOrigin(req)) return Response.json({ error: "Yêu cầu bị từ chối (sai nguồn gốc)" }, { status: 403 });
  if (getDataMode() === "supabase") {
    return Response.json({ error: "Tải ảnh lên chưa được hỗ trợ ở chế độ Supabase. Hãy dán URL ảnh (hoặc dùng Supabase Storage rồi dán URL công khai)." }, { status: 501 });
  }
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BYTES + 64 * 1024) return Response.json({ error: "Ảnh quá lớn (tối đa 2 MB)" }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Dữ liệu tải lên không hợp lệ" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Chưa chọn file" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Ảnh quá lớn (tối đa 2 MB)" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return Response.json({ error: "Chỉ nhận ảnh PNG, JPG, WebP hoặc GIF (không nhận SVG)" }, { status: 415 });

  const name = `${randomBytes(16).toString("hex")}.${kind.ext}`;
  const dir = path.join(getDataDir(), "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), bytes, { flag: "wx" });
  return Response.json({ path: `/api/uploads/${name}` });
}
