import type { CollectionKey } from "../types";
import type { CollectionTypes } from "../schemas";
import type { SettingKey, SettingVersion } from "../settings-schemas";
import type { BaseLayer } from "./base-layer";
import type { Actor, AuditEntry, ContentStore, SaveSettingOptions, UpsertOptions } from "./types";
import { StoreError, updateConflict } from "./types";

/**
 * Gộp lớp nhập sẵn (chỉ đọc) với kho thật. Quy tắc:
 *  - list: bản ghi trong kho + bản ghi của lớp nhập sẵn mà kho chưa có (kho thắng theo ID);
 *  - get: kho trước, lớp nhập sẵn sau;
 *  - upsert một bản ghi chỉ có ở lớp nhập sẵn → tạo bản ghi cùng ID trong kho (bản "đã sửa"); kiểm tra xung đột so với bản nhập sẵn;
 *  - remove bản ghi chỉ có ở lớp nhập sẵn → từ chối (hãy dùng "Ẩn"); xóa bản ghi đã ghi đè → quay lại bản nhập sẵn.
 */
export class LayeredStore implements ContentStore {
  constructor(
    private inner: ContentStore,
    private base: BaseLayer,
  ) {}

  get mode() {
    return this.inner.mode;
  }

  async list<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]> {
    const [own, base] = await Promise.all([this.inner.list(c), this.base.list(c)]);
    if (base.length === 0) return own;
    if (own.length === 0) return base;
    const have = new Set(own.map((r) => r.id));
    const merged = own.slice();
    for (const r of base) if (!have.has(r.id)) merged.push(r);
    return merged;
  }

  listOwn<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]> {
    return this.inner.list(c);
  }

  async get<K extends CollectionKey>(c: K, id: string): Promise<CollectionTypes[K] | null> {
    return (await this.inner.get(c, id)) ?? (await this.base.get(c, id));
  }

  async upsert<K extends CollectionKey>(c: K, record: CollectionTypes[K], actor: Actor, opts?: UpsertOptions): Promise<CollectionTypes[K]> {
    const own = await this.inner.get(c, record.id);
    if (own) return this.inner.upsert(c, record, actor, opts);
    const baseRec = await this.base.get(c, record.id);
    if (!baseRec) return this.inner.upsert(c, record, actor, opts);
    const conflict = updateConflict(baseRec as { updated_at?: string }, opts?.expectedUpdatedAt);
    if (conflict) throw new StoreError(conflict, "conflict");
    // kho chưa có bản ghi này → ghi mới (không truyền expectedUpdatedAt vì kho không có "bản trước")
    return this.inner.upsert(c, { ...record, created_at: record.created_at ?? (baseRec as { created_at?: string }).created_at } as CollectionTypes[K], actor);
  }

  upsertMany<K extends CollectionKey>(c: K, records: CollectionTypes[K][], actor: Actor, summary: string): Promise<number> {
    return this.inner.upsertMany(c, records, actor, summary);
  }

  async remove<K extends CollectionKey>(c: K, id: string, actor: Actor): Promise<void> {
    const own = await this.inner.get(c, id);
    if (!own) {
      if (await this.base.get(c, id)) {
        throw new StoreError("Bản ghi này thuộc dữ liệu nhập sẵn (chỉ đọc) nên không xóa được. Hãy bật \"Ẩn khỏi người học\" thay vì xóa.", "forbidden");
      }
    }
    return this.inner.remove(c, id, actor);
  }

  getSetting(key: SettingKey) {
    return this.inner.getSetting(key);
  }
  saveSetting(key: SettingKey, value: unknown, actor: Actor, opts?: SaveSettingOptions) {
    return this.inner.saveSetting(key, value, actor, opts);
  }
  settingHistory(key: SettingKey): Promise<SettingVersion[]> {
    return this.inner.settingHistory(key);
  }
  restoreSetting(key: SettingKey, version: number, actor: Actor) {
    return this.inner.restoreSetting(key, version, actor);
  }
  listAudit(opts?: { collection?: string; recordId?: string; limit?: number }): Promise<AuditEntry[]> {
    return this.inner.listAudit(opts);
  }
  get resetToSeed() {
    return this.inner.resetToSeed?.bind(this.inner);
  }
}
