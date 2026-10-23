import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollectionKey } from "../types";
import type { CollectionTypes } from "../schemas";
import type { SettingKey, SettingVersion } from "../settings-schemas";
import type { Actor, AuditAction, AuditEntry, ContentStore, SaveSettingOptions, UpsertOptions } from "./types";
import { StoreError, settingConflict, updateConflict } from "./types";

export const TABLES: Record<CollectionKey, string> = {
  sources: "lesson_sources",
  images: "image_assets",
  vocabulary: "vocabulary",
  kanji: "kanji",
  grammar: "grammar_points",
  sentences: "sentences",
  questions: "questions",
  quiz_sets: "quiz_sets",
  passages: "passages",
  conversations: "conversations",
  lessons: "lessons",
};

const PAGE = 1000;

import { promotedColumns, type AnyRec } from "./promoted";
export { promotedColumns };

function fail(error: { message: string; code?: string } | null, what: string): never {
  if (!error) throw new StoreError(what);
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message))
    throw new StoreError("Không đủ quyền thực hiện thao tác này (cần tài khoản quản trị).", "forbidden");
  if (error.code === "23505") throw new StoreError("Bản ghi đã tồn tại.", "conflict");
  throw new StoreError(`${what}: ${error.message}`);
}

export class SupabaseStore implements ContentStore {
  readonly mode = "supabase" as const;
  constructor(private client: SupabaseClient) {}

  async list<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]> {
    const out: CollectionTypes[K][] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.client
        .from(TABLES[c])
        .select("id,data")
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) fail(error, `Không đọc được ${c}`);
      for (const row of data ?? []) out.push({ ...(row.data as object), id: row.id } as CollectionTypes[K]);
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  async get<K extends CollectionKey>(c: K, id: string): Promise<CollectionTypes[K] | null> {
    const { data, error } = await this.client.from(TABLES[c]).select("id,data").eq("id", id).maybeSingle();
    if (error) fail(error, `Không đọc được ${c}/${id}`);
    return data ? ({ ...(data.data as object), id: data.id } as CollectionTypes[K]) : null;
  }

  private async audit(actor: Actor, e: { action: AuditAction; collection: string; record_id: string | null; summary: string; before: unknown; after: unknown }) {
    const { error } = await this.client.from("audit_logs").insert({
      actor_id: actor.id,
      actor_label: actor.label,
      action: e.action,
      collection: e.collection,
      record_id: e.record_id,
      summary: e.summary,
      before: e.before,
      after: e.after,
    });
    if (error) console.error("[SupabaseStore] không ghi được audit log:", error.message);
  }

  async upsert<K extends CollectionKey>(c: K, record: CollectionTypes[K], actor: Actor, opts?: UpsertOptions): Promise<CollectionTypes[K]> {
    const before = await this.get(c, record.id);
    // Kiểm tra ngay trước khi ghi. Giữa lúc đọc và ghi vẫn có khoảng hở cỡ mili-giây (không có giao dịch qua API này) — đủ để chặn tình huống thực tế "hai người mở cùng một form".
    const conflict = updateConflict(before, opts?.expectedUpdatedAt);
    if (conflict) throw new StoreError(conflict, "conflict");
    const now = new Date().toISOString();
    const next = { ...record, created_at: before?.created_at ?? record.created_at ?? now, updated_at: now } as CollectionTypes[K];
    const { error } = await this.client.from(TABLES[c]).upsert({
      id: record.id,
      ...promotedColumns(next as unknown as AnyRec),
      data: next,
      created_at: next.created_at,
      updated_at: now,
      updated_by: actor.id,
    });
    if (error) fail(error, `Không lưu được ${c}/${record.id}`);
    await this.audit(actor, {
      action: before ? "update" : "create",
      collection: c,
      record_id: record.id,
      summary: `${before ? "Sửa" : "Thêm"} ${c}/${record.id}`,
      before,
      after: next,
    });
    return next;
  }

  async upsertMany<K extends CollectionKey>(c: K, records: CollectionTypes[K][], actor: Actor, summary: string): Promise<number> {
    const now = new Date().toISOString();
    const rows = records.map((r) => ({
      id: r.id,
      ...promotedColumns(r as unknown as AnyRec),
      data: { ...r, updated_at: now },
      created_at: r.created_at ?? now,
      updated_at: now,
      updated_by: actor.id,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await this.client.from(TABLES[c]).upsert(rows.slice(i, i + 200));
      if (error) fail(error, `Không nhập được ${c}`);
    }
    await this.audit(actor, {
      action: "import",
      collection: c,
      record_id: null,
      summary: `${summary} (${records.length} bản ghi)`,
      before: null,
      after: { ids: records.map((r) => r.id) },
    });
    return records.length;
  }

  async remove<K extends CollectionKey>(c: K, id: string, actor: Actor): Promise<void> {
    const before = await this.get(c, id);
    if (!before) throw new StoreError(`Không tìm thấy ${c}/${id}`, "not_found");
    const { error } = await this.client.from(TABLES[c]).delete().eq("id", id);
    if (error) fail(error, `Không xóa được ${c}/${id}`);
    await this.audit(actor, { action: "delete", collection: c, record_id: id, summary: `Xóa ${c}/${id}`, before, after: null });
  }

  async getSetting(key: SettingKey): Promise<{ value: unknown; version: number } | null> {
    const { data, error } = await this.client.from("app_settings").select("value,version").eq("key", key).maybeSingle();
    if (error) {
      console.error("[SupabaseStore] đọc cấu hình lỗi:", error.message);
      return null;
    }
    return data ? { value: data.value, version: data.version } : null;
  }

  async saveSetting(key: SettingKey, value: unknown, actor: Actor, opts?: SaveSettingOptions): Promise<number> {
    const cur = await this.getSetting(key);
    const conflict = settingConflict(cur?.version ?? 0, opts?.expectedVersion);
    if (conflict) throw new StoreError(conflict, "conflict");
    const version = (cur?.version ?? 0) + 1;
    const now = new Date().toISOString();
    const { error } = await this.client
      .from("app_settings")
      .upsert({ key, value, version, updated_at: now, updated_by: actor.id });
    if (error) fail(error, `Không lưu được cấu hình ${key}`);
    const h = await this.client
      .from("settings_history")
      .insert({ key, version, value, saved_at: now, saved_by_label: actor.label });
    if (h.error) console.error("[SupabaseStore] không ghi được lịch sử cấu hình:", h.error.message);
    await this.audit(actor, {
      action: "settings",
      collection: "settings",
      record_id: key,
      summary: `Lưu cấu hình ${key} (phiên bản ${version})`,
      before: cur?.value ?? null,
      after: value,
    });
    return version;
  }

  async settingHistory(key: SettingKey): Promise<SettingVersion[]> {
    const { data, error } = await this.client
      .from("settings_history")
      .select("version,value,saved_at,saved_by_label")
      .eq("key", key)
      .order("version", { ascending: false })
      .limit(25);
    if (error) fail(error, "Không đọc được lịch sử cấu hình");
    return (data ?? []).map((r) => ({ version: r.version, value: r.value, saved_at: r.saved_at, saved_by: r.saved_by_label }));
  }

  async restoreSetting(key: SettingKey, version: number, actor: Actor): Promise<number> {
    const hist = await this.settingHistory(key);
    const target = hist.find((h) => h.version === version);
    if (!target) throw new StoreError(`Không có phiên bản ${version} của cấu hình ${key}`, "not_found");
    return this.saveSetting(key, target.value, { ...actor, label: `${actor.label} (khôi phục v${version})` });
  }

  async listAudit(opts: { collection?: string; recordId?: string; limit?: number } = {}): Promise<AuditEntry[]> {
    let q = this.client.from("audit_logs").select("*").order("at", { ascending: false }).limit(opts.limit ?? 200);
    if (opts.collection) q = q.eq("collection", opts.collection);
    if (opts.recordId) q = q.eq("record_id", opts.recordId);
    const { data, error } = await q;
    if (error) fail(error, "Không đọc được audit log");
    return (data ?? []).map((r) => ({
      id: r.id,
      at: r.at,
      actor: r.actor_label,
      action: r.action,
      collection: r.collection,
      record_id: r.record_id,
      summary: r.summary,
      before: r.before,
      after: r.after,
    }));
  }
}
