import { getVisible } from "@/lib/content";
import { buildItemLevelGroups } from "@/lib/item-levels";

/**
 * Bảng "mã mục → cấp" của nội dung người học được phép thấy, để Trang chủ/JLPT tính "đã xem x/y" theo cấp
 * mà KHÔNG phải nhúng hàng chục nghìn mã vào HTML. Dữ liệu công khai (giống các trang danh sách) nên cho phép cache ngắn.
 */
export async function GET() {
  const [vocabulary, kanji, grammar] = await Promise.all([getVisible("vocabulary"), getVisible("kanji"), getVisible("grammar")]);
  const body = buildItemLevelGroups({ vocabulary, kanji, grammar });
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600" } });
}
