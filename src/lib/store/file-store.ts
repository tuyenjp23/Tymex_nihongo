import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { CollectionKey } from "../types";
import { COLLECTION_KEYS } from "../types";
import type { CollectionTypes } from "../schemas";
import type { SettingKey, SettingVersion } from "../settings-schemas";
import type { Actor, AuditEntry, ContentStore, SaveSettingOptions, UpsertOptions } from "./types";
import { StoreError, settingConflict, updateConflict } from "./types";

interface SettingFile {
  [key: string]: { current: SettingVersion; history: SettingVersion[] };
}

const MAX_AUDIT = 3000;
const MAX_SETTING_HISTORY = 25;

/**
 * Lưu trữ bằng file JSON — dùng cho chế độ local/demo.
 *  - Đọc: ưu tiên data/<collection>.json (thay đổi của Admin); nếu chưa có thì đọc content/seed/<collection>.json.
 *  - Ghi: luôn ghi vào data/ (ghi tạm rồi đổi tên → không hỏng file nếu mất điện giữa chừng).
 *  - Ghi tuần tự trong tiến trình (mutex) để hai thao tác đồng thời không ghi đè nhau.
 * Lưu ý: môi trường serverless (Vercel...) có ổ đĩa chỉ đọc → production phải dùng Supabase.
 */
export class FileStore implements ContentStore {
  readonly mode = "local" as const;
  private cache = new Map<string, { mtimeMs: number; data: unknown }>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private dataDir: string,
    private seedDir: string,
  ) {}

  private lock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async readJsonFile<T>(file: string): Promise<T | null> {
    try {
      const stat = await fs.stat(file);
      const hit = this.cache.get(file);
      if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data as T;
      const text = await fs.readFile(file, "utf8");
      const data = JSON.parse(text) as T;
      this.cache.set(file, { mtimeMs: stat.mtimeMs, data });
      return data;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  private async writeJsonFile(file: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
    await fs.rename(tmp, file);
    this.cache.delete(file);
  }

  private dataFile(name: string) {
    return path.join(this.dataDir, `${name}.json`);
  }
  private seedFile(name: string) {
    return path.join(this.seedDir, `${name}.json`);
  }

  private async readCollection<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]> {
    try {
      const override = await this.readJsonFile<CollectionTypes[K][]>(this.dataFile(c));
      if (override) return override;
    } catch (e) {
      console.error(`[FileStore] data/${c}.json hỏng, dùng dữ liệu mẫu tạm thời:`, e);
    }
    return (await this.readJsonFile<CollectionTypes[K][]>(this.seedFile(c))) ?? [];
  }

  async list<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]> {
    return this.readCollection(c);
  }

  async get<K extends CollectionKey>(c: K, id: string): Promise<CollectionTypes[K] | null> {
    const all = await this.readCollection(c);
    return all.find((r) => r.id === id) ?? null;
  }

  async upsert<K extends CollectionKey>(c: K, record: CollectionTypes[K], actor: Actor, opts?: UpsertOptions): Promise<CollectionTypes[K]> {
    return this.lock(async () => {
      const all = [...(await this.readCollection(c))];
      const idx = all.findIndex((r) => r.id === record.id);
      const before = idx >= 0 ? all[idx] : null;
      const conflict = updateConflict(before, opts?.expectedUpdatedAt);
      if (conflict) throw new StoreError(conflict, "conflict");
      const now = new Date().toISOString();
      const next = { ...record, created_at: before?.created_at ?? record.created_at ?? now, updated_at: now } as CollectionTypes[K];
      if (idx >= 0) all[idx] = next;
      else all.push(next);
      await this.writeJsonFile(this.dataFile(c), all);
      await this.appendAudit({
        actor: actor.label,
        action: before ? "update" : "create",
        collection: c,
        record_id: record.id,
        summary: `${before ? "Sửa" : "Thêm"} ${c}/${record.id}`,
        before,
        after: next,
      });
      return next;
    });
  }

  async upsertMany<K extends CollectionKey>(c: K, records: CollectionTypes[K][], actor: Actor, summary: string): Promise<number> {
    return this.lock(async () => {
      const all = [...(await this.readCollection(c))];
      const index = new Map(all.map((r, i) => [r.id, i]));
      const now = new Date().toISOString();
      for (const rec of records) {
        const i = index.get(rec.id);
        const prev = i !== undefined ? all[i] : null;
        const next = { ...rec, created_at: prev?.created_at ?? rec.created_at ?? now, updated_at: now } as CollectionTypes[K];
        if (i !== undefined) all[i] = next;
        else {
          index.set(rec.id, all.length);
          all.push(next);
        }
      }
      await this.writeJsonFile(this.dataFile(c), all);
      await this.appendAudit({
        actor: actor.label,
        action: "import",
        collection: c,
        record_id: null,
        summary: `${summary} (${records.length} bản ghi)`,
        before: null,
        after: { ids: records.map((r) => r.id) },
      });
      return records.length;
    });
  }

  async remove<K extends CollectionKey>(c: K, id: string, actor: Actor): Promise<void> {
    await this.lock(async () => {
      const all = await this.readCollection(c);
      const before = all.find((r) => r.id === id);
      if (!before) throw new StoreError(`Không tìm thấy ${c}/${id}`, "not_found");
      await this.writeJsonFile(
        this.dataFile(c),
        all.filter((r) => r.id !== id),
      );
      await this.appendAudit({
        actor: actor.label,
        action: "delete",
        collection: c,
        record_id: id,
        summary: `Xóa ${c}/${id}`,
        before,
        after: null,
      });
    });
  }

  /* ───────────── Cài đặt ───────────── */

  private async readSettings(): Promise<SettingFile> {
    return (await this.readJsonFile<SettingFile>(this.dataFile("settings"))) ?? {};
  }

  async getSetting(key: SettingKey): Promise<{ value: unknown; version: number } | null> {
    try {
      const s = await this.readSettings();
      const cur = s[key]?.current;
      return cur ? { value: cur.value, version: cur.version } : null;
    } catch (e) {
      console.error("[FileStore] data/settings.json hỏng, dùng cấu hình mặc định:", e);
      return null;
    }
  }

  async saveSetting(key: SettingKey, value: unknown, actor: Actor, opts?: SaveSettingOptions): Promise<number> {
    return this.lock(async () => {
      const s = await this.readSettings().catch(() => ({}) as SettingFile);
      const prev = s[key];
      const conflict = settingConflict(prev?.current.version ?? 0, opts?.expectedVersion);
      if (conflict) throw new StoreError(conflict, "conflict");
      const version = (prev?.current.version ?? 0) + 1;
      const entry: SettingVersion = { version, saved_at: new Date().toISOString(), saved_by: actor.label, value };
      const history = [...(prev ? [prev.current, ...prev.history] : [])].slice(0, MAX_SETTING_HISTORY);
      s[key] = { current: entry, history };
      await this.writeJsonFile(this.dataFile("settings"), s);
      await this.appendAudit({
        actor: actor.label,
        action: "settings",
        collection: "settings",
        record_id: key,
        summary: `Lưu cấu hình ${key} (phiên bản ${version})`,
        before: prev?.current.value ?? null,
        after: value,
      });
      return version;
    });
  }

  async settingHistory(key: SettingKey): Promise<SettingVersion[]> {
    const s = await this.readSettings().catch(() => ({}) as SettingFile);
    const e = s[key];
    return e ? [e.current, ...e.history] : [];
  }

  async restoreSetting(key: SettingKey, version: number, actor: Actor): Promise<number> {
    const hist = await this.settingHistory(key);
    const target = hist.find((h) => h.version === version);
    if (!target) throw new StoreError(`Không có phiên bản ${version} của cấu hình ${key}`, "not_found");
    return this.saveSetting(key, target.value, { ...actor, label: `${actor.label} (khôi phục v${version})` });
  }

  /* ───────────── Audit ───────────── */

  private async appendAudit(e: Omit<AuditEntry, "id" | "at">): Promise<void> {
    const file = this.dataFile("audit");
    const list = (await this.readJsonFile<AuditEntry[]>(file).catch(() => null)) ?? [];
    const entry: AuditEntry = { id: randomUUID(), at: new Date().toISOString(), ...e };
    await this.writeJsonFile(file, [entry, ...list].slice(0, MAX_AUDIT));
  }

  async listAudit(opts: { collection?: string; recordId?: string; limit?: number } = {}): Promise<AuditEntry[]> {
    const list = (await this.readJsonFile<AuditEntry[]>(this.dataFile("audit")).catch(() => null)) ?? [];
    return list
      .filter((e) => (!opts.collection || e.collection === opts.collection) && (!opts.recordId || e.record_id === opts.recordId))
      .slice(0, opts.limit ?? 200);
  }

  async resetToSeed(collection: CollectionKey | "all", actor: Actor): Promise<void> {
    await this.lock(async () => {
      const targets: string[] = collection === "all" ? [...COLLECTION_KEYS, "settings"] : [collection];
      for (const t of targets) {
        await fs.rm(this.dataFile(t), { force: true });
        this.cache.delete(this.dataFile(t));
      }
      await this.appendAudit({
        actor: actor.label,
        action: "reset",
        collection: collection === "all" ? "*" : collection,
        record_id: null,
        summary: `Khôi phục dữ liệu mẫu: ${collection}`,
        before: null,
        after: null,
      });
    });
  }
}
