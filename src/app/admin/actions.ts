"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { StoreError } from "@/lib/store/types";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { SETTING_KEYS, SETTING_SCHEMAS, type SettingKey, type ThemeSettings } from "@/lib/settings-schemas";
import { contrastWarnings } from "@/lib/theme";
import { extraSettingChecks } from "@/lib/admin/setting-checks";
import { adminOrNull, loadAllRecords, loadValidationContext } from "@/lib/admin/server";
import { findUsages, issuePath, validateRecord, type FieldError } from "@/lib/admin/validate";

export type ActionResult =
  | { ok: true; message: string; id?: string; version?: number; warnings?: string[]; updatedAt?: string }
  | { ok: false; message: string; errors?: FieldError[]; conflict?: boolean };

const SESSION_EXPIRED: ActionResult = { ok: false, message: "Phiên đăng nhập quản trị đã hết hạn. Hãy tải lại trang và đăng nhập lại." };

function isCollection(x: unknown): x is CollectionKey {
  return typeof x === "string" && (COLLECTION_KEYS as readonly string[]).includes(x);
}
function isSettingKey(x: unknown): x is SettingKey {
  return typeof x === "string" && (SETTING_KEYS as readonly string[]).includes(x);
}

function storeFail(e: unknown): ActionResult {
  if (e instanceof StoreError) return { ok: false, message: e.message, conflict: e.code === "conflict" || undefined };
  console.error("[admin action]", e);
  return { ok: false, message: "Có lỗi khi lưu dữ liệu. Thử lại; nếu vẫn lỗi, xem log máy chủ." };
}

function refresh() {
  revalidatePath("/", "layout");
}

/* ───────────── Bản ghi nội dung ───────────── */

/**
 * `expectedUpdatedAt`: updated_at của bản mà người dùng đã mở (null khi tạo mới). Server so lại ngay lúc ghi → hai admin sửa cùng lúc sẽ không âm thầm đè nhau.
 */
export async function saveRecordAction(collection: string, input: unknown, isNew: boolean, expectedUpdatedAt?: string | null): Promise<ActionResult> {
  const actor = await adminOrNull();
  if (!actor) return SESSION_EXPIRED;
  if (!isCollection(collection)) return { ok: false, message: "Loại nội dung không hợp lệ" };
  try {
    const store = await getStore();
    const ctx = await loadValidationContext(store);
    const res = validateRecord(collection, input, ctx);
    if (!res.ok) return { ok: false, message: `Có ${res.errors.length} lỗi cần sửa`, errors: res.errors };
    const id = String(res.record.id);
    const exists = ctx.ids[collection]?.has(id) ?? false;
    if (isNew && exists) return { ok: false, message: "ID đã tồn tại", errors: [{ path: "id", message: `ID "${id}" đã được dùng` }] };
    if (!isNew && !exists) return { ok: false, message: "Bản ghi không còn tồn tại (có thể đã bị xóa)" };
    const expected = isNew ? null : typeof expectedUpdatedAt === "string" ? expectedUpdatedAt : undefined;
    const saved = await store.upsert(collection, res.record as never, actor, { expectedUpdatedAt: expected });
    refresh();
    return { ok: true, message: isNew ? "Đã thêm" : "Đã lưu", id: (saved as { id: string }).id, updatedAt: (saved as { updated_at?: string }).updated_at };
  } catch (e) {
    return storeFail(e);
  }
}

export async function deleteRecordAction(collection: string, id: string): Promise<ActionResult> {
  const actor = await adminOrNull();
  if (!actor) return SESSION_EXPIRED;
  if (!isCollection(collection) || typeof id !== "string") return { ok: false, message: "Yêu cầu không hợp lệ" };
  try {
    const store = await getStore();
    const usages = findUsages(collection, id, await loadAllRecords(store));
    if (usages.length > 0) {
      const list = usages.slice(0, 5).map((u) => `${u.collection}/${u.id}`).join(", ");
      return { ok: false, message: `Không thể xóa: còn ${usages.length} mục đang dùng (${list}${usages.length > 5 ? "…" : ""}). Gỡ liên kết trước, hoặc chọn "Ẩn" thay vì xóa.` };
    }
    await store.remove(collection, id, actor);
    refresh();
    return { ok: true, message: "Đã xóa" };
  } catch (e) {
    return storeFail(e);
  }
}

/** Khôi phục một bản ghi về trạng thái "trước" của một mục nhật ký (sửa hoặc xóa). */
export async function restoreAuditAction(auditId: string): Promise<ActionResult> {
  const actor = await adminOrNull();
  if (!actor) return SESSION_EXPIRED;
  try {
    const store = await getStore();
    const entry = (await store.listAudit({ limit: 3000 })).find((e) => e.id === auditId);
    if (!entry) return { ok: false, message: "Không tìm thấy mục nhật ký" };
    if (!isCollection(entry.collection) || !entry.record_id || !entry.before || (entry.action !== "update" && entry.action !== "delete")) {
      return { ok: false, message: "Mục này không có bản trước để khôi phục" };
    }
    const ctx = await loadValidationContext(store);
    const res = validateRecord(entry.collection, entry.before, ctx);
    if (!res.ok) return { ok: false, message: `Bản cũ không còn hợp lệ với quy tắc hiện tại: ${res.errors[0].message}`, errors: res.errors };
    await store.upsert(entry.collection, res.record as never, { ...actor, label: `${actor.label} (khôi phục)` });
    refresh();
    return { ok: true, message: "Đã khôi phục bản trước", id: entry.record_id };
  } catch (e) {
    return storeFail(e);
  }
}

/* ───────────── Cấu hình ───────────── */

export async function saveSettingAction(key: string, value: unknown, expectedVersion?: number): Promise<ActionResult> {
  const actor = await adminOrNull();
  if (!actor) return SESSION_EXPIRED;
  if (!isSettingKey(key)) return { ok: false, message: "Loại cấu hình không hợp lệ" };
  const parsed = SETTING_SCHEMAS[key].safeParse(value);
  if (!parsed.success) {
    return { ok: false, message: "Cấu hình không hợp lệ", errors: parsed.error.issues.map((i) => ({ path: issuePath(i), message: i.message })) };
  }
  const extra = extraSettingChecks(key, parsed.data);
  if (extra.length) return { ok: false, message: extra[0].message, errors: extra };
  try {
    const store = await getStore();
    const version = await store.saveSetting(key, parsed.data, actor, { expectedVersion: Number.isInteger(expectedVersion) ? expectedVersion : undefined });
    refresh();
    const warnings = key === "theme" ? contrastWarnings(parsed.data as ThemeSettings).map((w) => `${w.mode === "light" ? "Sáng" : "Tối"}: ${w.pair} chỉ đạt ${w.ratio}:1 (cần ≥ ${w.min}:1)`) : [];
    return { ok: true, message: `Đã lưu (phiên bản ${version})`, version, warnings };
  } catch (e) {
    return storeFail(e);
  }
}

export async function restoreSettingAction(key: string, version: number): Promise<ActionResult> {
  const actor = await adminOrNull();
  if (!actor) return SESSION_EXPIRED;
  if (!isSettingKey(key) || !Number.isInteger(version)) return { ok: false, message: "Yêu cầu không hợp lệ" };
  try {
    const store = await getStore();
    const hist = await store.settingHistory(key);
    const target = hist.find((h) => h.version === version);
    if (!target) return { ok: false, message: `Không có phiên bản ${version}` };
    // Bản cũ có thể không còn hợp lệ nếu schema đã đổi → kiểm tra lại trước khi áp dụng
    if (!SETTING_SCHEMAS[key].safeParse(target.value).success) return { ok: false, message: "Phiên bản cũ không còn tương thích với phiên bản ứng dụng hiện tại" };
    const v = await store.restoreSetting(key, version, actor);
    refresh();
    return { ok: true, message: `Đã khôi phục v${version} (lưu thành phiên bản ${v})`, version: v };
  } catch (e) {
    return storeFail(e);
  }
}

/* ───────────── Quay về dữ liệu mẫu (chỉ chế độ local) ───────────── */

export async function resetToSeedAction(collection: string): Promise<ActionResult> {
  const actor = await adminOrNull();
  if (!actor) return SESSION_EXPIRED;
  if (collection !== "all" && !isCollection(collection)) return { ok: false, message: "Yêu cầu không hợp lệ" };
  try {
    const store = await getStore();
    if (!store.resetToSeed) return { ok: false, message: "Chế độ Supabase không hỗ trợ khôi phục dữ liệu mẫu từ đây." };
    await store.resetToSeed(collection, actor);
    refresh();
    return { ok: true, message: "Đã quay về dữ liệu mẫu" };
  } catch (e) {
    return storeFail(e);
  }
}
