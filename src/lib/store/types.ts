import type { CollectionKey } from "../types";
import type { CollectionTypes } from "../schemas";
import type { SettingKey, SettingVersion } from "../settings-schemas";
import { formatDateTimeVi } from "../dates";

export interface Actor {
  id: string;
  label: string;
}

export type AuditAction = "create" | "update" | "delete" | "import" | "settings" | "reset" | "restore";

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  collection: string;
  record_id: string | null;
  summary: string;
  before: unknown | null;
  after: unknown | null;
}

export interface UpsertOptions {
  expectedUpdatedAt?: string | null;
}
export interface SaveSettingOptions {
  expectedVersion?: number;
}

/** Kiểm tra "bản tôi mở còn là bản hiện tại không". Trả thông báo lỗi tiếng Việt nếu xung đột, ngược lại null. Hàm thuần, dùng chung cho mọi store. */
export function updateConflict(current: { updated_at?: string } | null, expected: string | null | undefined): string | null {
  if (expected === undefined) return null;
  if (expected === null) return current ? "Bản ghi này vừa được người khác tạo với cùng ID. Chưa lưu gì cả — hãy tải lại trang." : null;
  if (!current) return "Bản ghi đã bị người khác xóa sau khi bạn mở form. Chưa lưu gì cả.";
  if ((current.updated_at ?? null) === expected) return null;
  const when = current.updated_at ? ` lúc ${formatDateTimeVi(current.updated_at)}` : "";
  return `Bản ghi đã được người khác sửa${when}, sau khi bạn mở form. Chưa lưu gì cả — hãy tải lại để xem bản mới nhất rồi áp dụng lại thay đổi của bạn.`;
}

export function settingConflict(currentVersion: number, expected: number | undefined): string | null {
  if (expected === undefined || expected === currentVersion) return null;
  return `Cấu hình này đã được người khác lưu (hiện là phiên bản ${currentVersion}, bạn đang sửa từ phiên bản ${expected}). Chưa lưu gì cả — hãy tải lại trang rồi áp dụng lại thay đổi của bạn.`;
}

export class StoreError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "conflict" | "forbidden" | "unavailable" | "invalid" = "unavailable",
  ) {
    super(message);
    this.name = "StoreError";
  }
}

/**
 * Giao diện lưu trữ nội dung & cấu hình. Có 2 bản cài đặt:
 *  - FileStore (chế độ local/demo): dữ liệu mẫu trong content/seed, thay đổi của Admin ghi vào /data/*.json
 *  - SupabaseStore (production): PostgreSQL + Row Level Security
 * Mọi thao tác ghi đều tự ghi audit log.
 */
export interface ContentStore {
  readonly mode: "local" | "supabase";
  list<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]>;
  get<K extends CollectionKey>(c: K, id: string): Promise<CollectionTypes[K] | null>;
  /**
   * Tạo hoặc cập nhật. `created_at` được giữ, `updated_at` đặt lại = bây giờ.
   * `opts.expectedUpdatedAt` (chống ghi đè khi hai người sửa cùng lúc): chuỗi = "tôi đã mở bản có updated_at này", null = "tôi đang tạo mới".
   * Nếu bản hiện tại khác → ném StoreError("conflict") và KHÔNG ghi gì. Bỏ qua (undefined) = không kiểm tra.
   */
  upsert<K extends CollectionKey>(c: K, record: CollectionTypes[K], actor: Actor, opts?: UpsertOptions): Promise<CollectionTypes[K]>;
  upsertMany<K extends CollectionKey>(c: K, records: CollectionTypes[K][], actor: Actor, summary: string): Promise<number>;
  remove<K extends CollectionKey>(c: K, id: string, actor: Actor): Promise<void>;

  getSetting(key: SettingKey): Promise<{ value: unknown; version: number } | null>;
  /** `opts.expectedVersion`: phiên bản mà người sửa đã mở (0 = chưa từng lưu). Khác phiên bản hiện hành → StoreError("conflict"). */
  saveSetting(key: SettingKey, value: unknown, actor: Actor, opts?: SaveSettingOptions): Promise<number>;
  settingHistory(key: SettingKey): Promise<SettingVersion[]>;
  restoreSetting(key: SettingKey, version: number, actor: Actor): Promise<number>;

  listAudit(opts?: { collection?: string; recordId?: string; limit?: number }): Promise<AuditEntry[]>;
  /** Chỉ chế độ local: xóa thay đổi của Admin, quay lại dữ liệu mẫu. */
  resetToSeed?(collection: CollectionKey | "all", actor: Actor): Promise<void>;
}
