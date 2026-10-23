import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "@/lib/store";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** Phục vụ ảnh admin đã tải lên (chế độ local). Tên file được kiểm tra chặt → không thể đọc file ngoài thư mục uploads. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const m = /^[a-f0-9]{32}\.(png|jpg|webp|gif)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(getDataDir(), "uploads", name));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[m[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
