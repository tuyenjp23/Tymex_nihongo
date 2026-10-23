import fs from "node:fs";
import path from "node:path";
import type { Source } from "../schemas";
import type { Actor, ContentStore } from "../store/types";
import type { CollectionKey } from "../types";
import { findUsages } from "../admin/validate";
import { recordBaseHash } from "./hash";
import { buildReport, renderMarkdown, type RunReport, type WriteResult } from "./report";
import { KINDS, planImport, type ImportPlan, type Kind, type PlanOptions } from "./plan";
import { loadTranslations } from "./translations";

type Rec = Record<string, unknown>;

export class ImportAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportAbort";
  }
}

export interface RunOptions extends Omit<PlanOptions, "runId" | "now" | "translations"> {
  runId?: string;
  dryRun: boolean;
  dataDir: string;
  seedDir: string;
  translationsFile?: string;
  resume?: boolean;
  batchSize?: number;
  /** Thời điểm hiện tại (truyền vào để test) */
  now?: () => Date;
}

export interface RunResult {
  plan: ImportPlan;
  report: RunReport;
  reportFiles: { json: string; md: string };
}

export const importDirs = (dataDir: string) => {
  const root = path.join(dataDir, "import");
  return { root, reports: path.join(root, "reports"), logs: path.join(root, "logs"), backups: path.join(root, "backups"), runs: path.join(root, "runs"), lock: path.join(root, ".lock") };
};

export function makeRunId(group: string, d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}-${group}`;
}

async function readSeedSources(seedDir: string): Promise<Rec[]> {
  try {
    return JSON.parse(await fs.promises.readFile(path.join(seedDir, "sources.json"), "utf8")) as Rec[];
  } catch {
    return [];
  }
}

/** Sao lưu mọi file JSON ở cấp trên cùng của thư mục dữ liệu (nội dung, cấu hình, audit). Không đụng tới ảnh tải lên. */
export async function backupDataDir(dataDir: string, destDir: string): Promise<{ files: string[]; absent: string[] }> {
  await fs.promises.mkdir(destDir, { recursive: true });
  const files: string[] = [];
  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.promises.readdir(dataDir, { withFileTypes: true });
  } catch {
    entries = [];
  }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    await fs.promises.copyFile(path.join(dataDir, e.name), path.join(destDir, e.name));
    files.push(e.name);
  }
  const absent = ["vocabulary", "kanji", "sentences", "sources"].filter((c) => !files.includes(`${c}.json`));
  await fs.promises.writeFile(path.join(destDir, "backup-manifest.json"), JSON.stringify({ at: new Date().toISOString(), files, absent_means_seed_only: absent }, null, 2));
  return { files, absent };
}

async function acquireLock(lockFile: string, runId: string) {
  await fs.promises.mkdir(path.dirname(lockFile), { recursive: true });
  try {
    const h = await fs.promises.open(lockFile, "wx");
    await h.writeFile(JSON.stringify({ runId, pid: process.pid, at: new Date().toISOString() }));
    await h.close();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      let who = "";
      try {
        who = await fs.promises.readFile(lockFile, "utf8");
      } catch {
        /* bỏ qua */
      }
      throw new ImportAbort(`Đang có một lần nhập khác chạy (hoặc lần trước bị dừng đột ngột): ${who || lockFile}. Nếu chắc chắn không có lần nhập nào đang chạy, hãy xóa file ${lockFile} rồi chạy lại.`);
    }
    throw e;
  }
}

interface RunState {
  runId: string;
  group: string;
  kinds: Kind[];
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt?: string;
  backupDir: string | null;
  resumedFrom?: number;
  batches: { kind: Kind; index: number; count: number; at: string }[];
  error?: string;
}

const actorFor = (runId: string): Actor => ({ id: "import-cli", label: `import-cli (${runId})` });

/**
 * Chạy một lần nhập: lập kế hoạch → (nếu không phải dry-run) sao lưu → ghi theo lô → đọc lại kiểm tra → cập nhật sổ nguồn → báo cáo.
 * Chạy lại cùng lệnh là an toàn (idempotent): bản ghi đã nhập và chưa bị sửa sẽ được nhận ra là "không đổi".
 */
export async function runImport(opts: RunOptions, store: ContentStore, log: (line: string) => void = () => undefined): Promise<RunResult> {
  const clock = opts.now ?? (() => new Date());
  const startedAt = clock();
  const dirs = importDirs(opts.dataDir);
  const runId = opts.runId ?? makeRunId(opts.group.id, startedAt);
  const stateFile = path.join(dirs.runs, runId, "state.json");
  const logFile = path.join(dirs.logs, `${runId}.log`);
  await fs.promises.mkdir(dirs.logs, { recursive: true });
  const logger = (line: string) => {
    log(line);
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
  };

  let prevState: RunState | null = null;
  if (opts.resume) {
    try {
      prevState = JSON.parse(await fs.promises.readFile(stateFile, "utf8")) as RunState;
    } catch {
      throw new ImportAbort(`Không có lần chạy "${runId}" để tiếp tục (thiếu ${stateFile}).`);
    }
    if (prevState.status === "completed") throw new ImportAbort(`Lần chạy "${runId}" đã hoàn tất — không cần tiếp tục.`);
  }

  const [vocabulary, kanji, sentences, sources] = await Promise.all([store.list("vocabulary"), store.list("kanji"), store.list("sentences"), store.list("sources")]);
  const seedSources = await readSeedSources(opts.seedDir);
  const translations = await loadTranslations(opts.translationsFile);
  if (translations.errors.length > 0) logger(`⚠ File bản dịch có ${translations.errors.length} dòng lỗi (đã bỏ qua): ${translations.errors.slice(0, 3).map((e) => `dòng ${e.line}: ${e.message}`).join("; ")}`);

  logger(`Lập kế hoạch ${opts.dryRun ? "(chạy thử)" : "(ghi thật)"}: nhóm ${opts.group.id}, loại ${opts.kinds.join("+")}${opts.limit ? `, giới hạn ${opts.limit}` : ""}`);
  const plan = await planImport(
    { ...opts, runId, now: startedAt.toISOString(), translations, hashes: true },
    { vocabulary: vocabulary as Rec[], kanji: kanji as Rec[], sentences: sentences as Rec[], sources: sources as Rec[], seedSources },
  );
  for (const k of KINDS) {
    const c = plan.collections[k];
    if (plan.kinds.includes(k)) logger(`  ${k}: đọc ${c.seen}, thuộc nhóm ${c.considered}, thêm ${c.creates.length}, cập nhật ${c.updates.length}, bỏ qua ${c.skips.length}, lỗi ${c.errors.length}${c.refused ? ` — TỪ CHỐI: ${c.refused}` : ""}`);
  }
  // Nhật ký chi tiết từng quyết định (để truy vết)
  for (const k of plan.kinds) {
    const c = plan.collections[k];
    for (const r of c.creates) logger(`create ${k}/${String(r.id)}`);
    for (const u of c.updates) logger(`update ${k}/${String(u.after.id)}`);
    for (const s of c.skips) logger(`skip ${k}/${s.id} ${s.reason}${s.detail ? ` (${s.detail})` : ""}`);
    for (const e of c.errors) logger(`error ${k}/${e.id} ${e.errors.map((x) => `${x.path}: ${x.message}`).join("; ")}`);
  }

  const sourceMap = new Map<string, Source>([...(seedSources as unknown as Source[]), ...(sources as unknown as Source[])].map((s) => [s.id, s]));
  const writeReports = async (report: RunReport) => {
    await fs.promises.mkdir(dirs.reports, { recursive: true });
    const base = path.join(dirs.reports, `${runId}${opts.dryRun ? "-dry-run" : ""}`);
    await fs.promises.writeFile(`${base}.json`, JSON.stringify(report, null, 2) + "\n");
    await fs.promises.writeFile(`${base}.md`, renderMarkdown(report));
    return { json: `${base}.json`, md: `${base}.md` };
  };

  const hasWork = KINDS.some((k) => plan.collections[k].creates.length + plan.collections[k].updates.length > 0) || plan.sourcesToAdd.length > 0;

  if (opts.dryRun || !hasWork) {
    const report = buildReport(plan, { mode: opts.dryRun ? "dry-run" : "apply", startedAt: startedAt.toISOString(), finishedAt: clock().toISOString(), sources: sourceMap, warnings: opts.dryRun ? [] : ["Không có gì để ghi."] });
    const reportFiles = await writeReports(report);
    logger(opts.dryRun ? "Chạy thử xong — chưa ghi gì vào dữ liệu." : "Không có thay đổi nào để ghi.");
    return { plan, report, reportFiles };
  }

  // ───── Ghi thật ─────
  await acquireLock(dirs.lock, runId);
  const state: RunState = prevState ?? { runId, group: opts.group.id, kinds: plan.kinds, status: "running", startedAt: startedAt.toISOString(), backupDir: null, batches: [] };
  state.status = "running";
  if (prevState) state.resumedFrom = prevState.batches.length;
  const saveState = async () => {
    await fs.promises.mkdir(path.dirname(stateFile), { recursive: true });
    await fs.promises.writeFile(stateFile, JSON.stringify(state, null, 2));
  };
  const written: Partial<Record<Kind, WriteResult>> = {};
  const actor = actorFor(runId);
  const batchSize = Math.max(1, opts.batchSize ?? 200);
  try {
    if (!state.backupDir) {
      const dest = path.join(dirs.backups, runId);
      const b = await backupDataDir(opts.dataDir, dest);
      state.backupDir = dest;
      logger(`Đã sao lưu ${b.files.length} file dữ liệu vào ${dest}`);
    } else logger(`Tiếp tục lần chạy cũ, dùng lại bản sao lưu ${state.backupDir}`);
    await saveState();

    if (plan.sourcesToAdd.length > 0) {
      const now = startedAt.toISOString();
      await store.upsertMany("sources", plan.sourcesToAdd.map((s) => ({ ...s, created_at: now, updated_at: now })) as never, actor, `Bổ sung nguồn cho lần nhập ${runId}`);
      logger(`Đã thêm ${plan.sourcesToAdd.length} nguồn vào sổ nguồn: ${plan.sourcesToAdd.map((s) => String(s.id)).join(", ")}`);
    }

    const changes: { created: Record<string, string[]>; updated: Record<string, string[]> } = { created: {}, updated: {} };
    for (const k of KINDS) {
      if (!plan.kinds.includes(k)) continue;
      const c = plan.collections[k];
      const items = [...c.creates, ...c.updates.map((u) => u.after)];
      if (items.length === 0) continue;
      changes.created[k] = c.creates.map((r) => String(r.id));
      changes.updated[k] = c.updates.map((u) => String(u.after.id));
      let batches = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const slice = items.slice(i, i + batchSize);
        await store.upsertMany(k as CollectionKey as never, slice as never, actor, `Nhập ${k} (${runId}) lô ${batches + 1}`);
        batches++;
        state.batches.push({ kind: k, index: batches, count: slice.length, at: new Date().toISOString() });
        await saveState();
        logger(`  ghi ${k} lô ${batches}: ${slice.length} bản ghi`);
      }
      // Đọc lại để kiểm tra những gì đã ghi khớp với bản đã kiểm tra (không tin vào "ghi thành công")
      const stored = new Map((await store.list(k as never)).map((r) => [String((r as Rec).id), r as Rec]));
      let verified = 0;
      const mismatched: string[] = [];
      for (const r of items) {
        const s = stored.get(String(r.id));
        const meta = s?.import as Rec | null | undefined;
        if (s && meta && meta.base_hash === recordBaseHash(s) && meta.run_id === runId) verified++;
        else mismatched.push(String(r.id));
      }
      written[k] = { written: items.length, verified, mismatched, batches };
      logger(`  kiểm tra ${k}: ${verified}/${items.length} khớp`);
    }
    await fs.promises.mkdir(path.join(dirs.runs, runId), { recursive: true });
    await fs.promises.writeFile(path.join(dirs.runs, runId, "changes.json"), JSON.stringify(changes, null, 2));

    // Cập nhật sổ nguồn: ngày lấy dữ liệu + lịch sử cập nhật (không đụng tới các trường giấy phép/chính sách do quản trị viên đặt)
    const today = startedAt.toISOString().slice(0, 10);
    const fresh = new Map((await store.list("sources")).map((s) => [s.id, s]));
    for (const id of plan.sourcesUsed) {
      const s = fresh.get(id);
      if (!s) continue;
      const counts = plan.kinds.map((k) => `${k}: +${plan.collections[k].creates.length}/~${plan.collections[k].updates.length}`).join(", ");
      const next = {
        ...s,
        retrieved_at: today,
        update_history: [...s.update_history, { at: startedAt.toISOString(), version: plan.dataset.datasetVersion, group: opts.group.id, run_id: runId, summary: `Nhập nhóm ${opts.group.id} (${counts})`.slice(0, 400) }].slice(-300),
      };
      await store.upsert("sources", next, actor, { expectedUpdatedAt: s.updated_at });
    }
    logger(`Đã cập nhật lịch sử cập nhật cho ${plan.sourcesUsed.length} nguồn.`);

    state.status = "completed";
    state.finishedAt = clock().toISOString();
    await saveState();
    const freshSources = new Map((await store.list("sources")).map((s) => [s.id, s as Source]));
    const report = buildReport(plan, { mode: "apply", startedAt: startedAt.toISOString(), finishedAt: state.finishedAt, sources: freshSources, written, backupDir: state.backupDir });
    const reportFiles = await writeReports(report);
    logger(`Hoàn tất. Báo cáo: ${reportFiles.md}`);
    return { plan, report, reportFiles };
  } catch (e) {
    state.status = "failed";
    state.error = (e as Error).message;
    await saveState().catch(() => undefined);
    logger(`✗ Lỗi giữa chừng: ${(e as Error).message}. Dữ liệu đã được sao lưu tại ${state.backupDir}; chạy lại cùng lệnh (kèm --resume ${runId}) để tiếp tục.`);
    throw e;
  } finally {
    await fs.promises.rm(dirs.lock, { force: true });
  }
}

/* ───────────── Hoàn tác một lần nhập ───────────── */

export interface RollbackResult {
  removed: { kind: Kind; id: string }[];
  restored: { kind: Kind; id: string }[];
  kept: { kind: Kind; id: string; reason: string }[];
}

/**
 * Hoàn tác một lần nhập: xóa các bản ghi do lần chạy đó TẠO ra (chỉ khi chưa ai sửa và không còn bản ghi khác trỏ tới),
 * và khôi phục các bản ghi lần chạy đó CẬP NHẬT từ bản sao lưu (chỉ khi chưa ai sửa tay sau đó). Không đụng tới bản ghi nào khác.
 */
export async function rollbackRun(runId: string, dataDir: string, store: ContentStore, dryRun: boolean): Promise<RollbackResult> {
  const dirs = importDirs(dataDir);
  const changesFile = path.join(dirs.runs, runId, "changes.json");
  if (!fs.existsSync(changesFile)) throw new ImportAbort(`Không có lịch sử thay đổi của lần chạy "${runId}" (${changesFile}).`);
  const changes = JSON.parse(fs.readFileSync(changesFile, "utf8")) as { created: Record<string, string[]>; updated: Record<string, string[]> };
  const backupDir = path.join(dirs.backups, runId);
  const actor: Actor = { id: "import-cli", label: `import-cli rollback (${runId})` };
  const res: RollbackResult = { removed: [], restored: [], kept: [] };
  await acquireLock(dirs.lock, `rollback-${runId}`);
  try {
    const order: Kind[] = ["sentences", "kanji", "vocabulary"];
    const data: Partial<Record<CollectionKey, Rec[]>> = {};
    for (const k of [...order, "questions", "quiz_sets", "lessons"] as CollectionKey[]) data[k] = (await store.list(k as never)) as Rec[];
    for (const k of order) {
      const cur = new Map((data[k] ?? []).map((r) => [String(r.id), r]));
      for (const id of changes.created[k] ?? []) {
        const r = cur.get(id);
        if (!r) continue;
        const meta = r.import as Rec | null;
        if (!meta || meta.run_id !== runId) res.kept.push({ kind: k, id, reason: "không còn là bản ghi của lần nhập này" });
        else if (meta.base_hash !== recordBaseHash(r)) res.kept.push({ kind: k, id, reason: "đã bị sửa tay sau khi nhập" });
        else if (findUsages(k as CollectionKey, id, data as never).length > 0) res.kept.push({ kind: k, id, reason: "đang được bản ghi khác sử dụng" });
        else {
          if (!dryRun) {
            await store.remove(k as never, id, actor);
            data[k] = (data[k] ?? []).filter((x) => String(x.id) !== id);
          }
          res.removed.push({ kind: k, id });
        }
      }
      const ids = changes.updated[k] ?? [];
      if (ids.length > 0) {
        let backup: Rec[] = [];
        try {
          backup = JSON.parse(fs.readFileSync(path.join(backupDir, `${k}.json`), "utf8")) as Rec[];
        } catch {
          backup = [];
        }
        const old = new Map(backup.map((r) => [String(r.id), r]));
        for (const id of ids) {
          const r = cur.get(id);
          const prev = old.get(id);
          if (!r || !prev) {
            res.kept.push({ kind: k, id, reason: "không có bản sao lưu của bản ghi này" });
            continue;
          }
          const meta = r.import as Rec | null;
          if (!meta || meta.run_id !== runId || meta.base_hash !== recordBaseHash(r)) {
            res.kept.push({ kind: k, id, reason: "đã bị sửa tay hoặc thay bởi lần nhập khác" });
            continue;
          }
          if (!dryRun) await store.upsert(k as never, prev as never, actor);
          res.restored.push({ kind: k, id });
        }
      }
    }
  } finally {
    await fs.promises.rm(dirs.lock, { force: true });
  }
  return res;
}
