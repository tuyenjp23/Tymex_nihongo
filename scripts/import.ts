/**
 * Công cụ nhập dữ liệu học tập từ nguồn đáng tin cậy — chạy bằng `npm run import:<lệnh>` (xem docs/CAP-NHAT-DU-LIEU.md).
 *
 *   inspect          Kiểm tra bộ dữ liệu: phiên bản, giấy phép, định dạng, nguồn nào được phép nhập (không ghi gì)
 *   plan             Chạy thử (dry-run): đọc, chuẩn hóa, kiểm tra, ghi báo cáo — KHÔNG ghi vào dữ liệu
 *   apply  --yes     Nhập thật: sao lưu → ghi theo lô → đọc lại kiểm tra → cập nhật sổ nguồn → báo cáo
 *   resume --run ID  Tiếp tục một lần nhập bị dừng giữa chừng
 *   rollback --run ID [--yes]   Hoàn tác một lần nhập (chạy thử nếu thiếu --yes)
 *   backup           Sao lưu thư mục dữ liệu (file JSON) ngay bây giờ
 *   translate-export Xuất danh sách mục chưa có tiếng Việt để dịch (điền "vi" rồi nạp lại bằng --translations)
 *   export-base      Xuất các mục đã nhập thành "dữ liệu nhập sẵn" content/imported/*.json (đưa lên website; xem docs/CAP-NHAT-DU-LIEU.md)
 *   quality          Kiểm tra chất lượng dữ liệu đang có (thiếu cách đọc/nghĩa/nguồn/giấy phép, dịch máy chưa duyệt, câu trùng…)
 *
 * Tùy chọn chung: --group jlpt-n5  --kinds vocabulary,kanji,sentences  --limit 50  --dataset <thư mục>  --translations <file.jsonl>  --no-translations
 * Biến môi trường: NC_DATA_DIR (thư mục dữ liệu của Admin), NC_SEED_DIR, NC_IMPORT_DATASET.
 */
import fs from "node:fs";
import path from "node:path";
import { FileStore } from "../src/lib/store/file-store";
import { ImportAbort, backupDataDir, importDirs, makeRunId, rollbackRun, runImport } from "../src/lib/import/run";
import { GROUPS, KINDS, inspectDataset, resolveGroup, sourceGate, type Kind } from "../src/lib/import/plan";
import { SKIP_REASON_LABELS } from "../src/lib/import/normalize";
import { runQualityChecks, renderQualityText } from "../src/lib/import/quality";
import type { Source } from "../src/lib/schemas";
import { BASE_COLLECTIONS, ExportError, buildBaseExport, type BaseCollection } from "../src/lib/import/export-base";

interface Args {
  cmd: string;
  flags: Map<string, string | true>;
}

function parseArgs(argv: string[]): Args {
  const [cmd = "help", ...rest] = argv;
  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const eq = key.indexOf("=");
    if (eq >= 0) flags.set(key.slice(0, eq), key.slice(eq + 1));
    else if (rest[i + 1] !== undefined && !rest[i + 1].startsWith("--")) flags.set(key, rest[++i]);
    else flags.set(key, true);
  }
  return { cmd, flags };
}

const root = process.cwd();
const dataDir = path.resolve(process.env.NC_DATA_DIR ?? path.join(root, "data"));
const seedDir = path.resolve(process.env.NC_SEED_DIR ?? path.join(root, "content", "seed"));

function fail(msg: string, code = 1): never {
  console.error(`\n✗ ${msg}`);
  process.exit(code);
}

function str(a: Args, k: string): string | undefined {
  const v = a.flags.get(k);
  return typeof v === "string" ? v : undefined;
}

function common(a: Args) {
  const datasetDir = path.resolve(str(a, "dataset") ?? process.env.NC_IMPORT_DATASET ?? path.join(root, "japanese-language-data-main"));
  const groupId = str(a, "group") ?? "";
  const group = groupId ? resolveGroup(groupId) : null;
  const kindsArg = str(a, "kinds");
  const kinds = (kindsArg ? kindsArg.split(",").map((s) => s.trim()).filter(Boolean) : [...KINDS]) as Kind[];
  const bad = kinds.filter((k) => !KINDS.includes(k));
  if (bad.length) fail(`--kinds không hợp lệ: ${bad.join(", ")}. Chọn trong: ${KINDS.join(", ")}`, 2);
  const limitRaw = str(a, "limit");
  const limit = limitRaw ? Number(limitRaw) : null;
  if (limitRaw && (!Number.isInteger(limit) || limit! < 1)) fail("--limit phải là số nguyên dương", 2);
  const defaultTr = path.join(root, "content", "import", "translations-vi.jsonl");
  // --no-translations: không nạp bản dịch máy nào (kể cả file mặc định) → phần tiếng Việt để trống
  const translationsFile = a.flags.has("no-translations") ? undefined : (str(a, "translations") ?? (fs.existsSync(defaultTr) ? defaultTr : undefined));
  const maxSentencesPerWord = str(a, "max-sentences") ? Number(str(a, "max-sentences")) : 3;
  return { datasetDir, group, groupId, kinds, limit, translationsFile, maxSentencesPerWord };
}

function printHelp() {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0].replace(/^\/\*\*\n?/, "").replace(/^ \* ?/gm, ""));
  console.log(`Nhóm có sẵn: ${Object.keys(GROUPS).join(", ")}`);
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const store = new FileStore(dataDir, seedDir);

  switch (a.cmd) {
    case "help":
    case "--help":
    case "-h":
      return printHelp();

    case "inspect": {
      const c = common(a);
      const sources = new Map((await store.list("sources")).map((s) => [s.id, s as Source]));
      const info = await inspectDataset(c.datasetDir, { hashes: a.flags.has("hash"), registered: sources });
      console.log(`Bộ dữ liệu: ${info.dir}`);
      console.log(`  Phiên bản (manifest): ${info.manifestVersion || "?"} · dựng ${info.generated || "?"} · giấy phép ${info.manifestLicense || "?"}`);
      console.log(`  Chuỗi phiên bản dùng để ghi vết: ${info.datasetVersion}`);
      for (const [k, f] of Object.entries(info.files)) console.log(`  - ${k}: ${f.exists ? `${(f.bytes / 1e6).toFixed(1)} MB, ${f.count ?? "?"} mục, giấy phép "${f.license}"${f.sha256 ? `, sha256 ${f.sha256}` : ""}` : "THIẾU FILE"}`);
      for (const w of info.warnings) console.log(`  ⚠ ${w}`);
      for (const p of info.problems) console.log(`  ✗ ${p}`);
      console.log("\nNguồn trong sổ nguồn học liệu và việc cho phép nhập:");
      for (const k of KINDS) {
        const why = sourceGate(k, sources);
        console.log(`  ${k.padEnd(10)} ${why ? `✗ TỪ CHỐI — ${why}` : "✓ được phép (giấy phép đã kiểm tra)"}`);
      }
      const blocked = [...sources.values()].filter((s) => s.import_policy === "blocked");
      if (blocked.length) console.log(`\nNguồn bị CHẶN nhập (chỉ liên kết, không sao chép): ${blocked.map((s) => s.id).join(", ")}`);
      if (info.problems.length) process.exit(1);
      return;
    }

    case "plan":
    case "apply":
    case "resume": {
      const c = common(a);
      const resume = a.cmd === "resume";
      const runArg = str(a, "run");
      if (resume && !runArg) fail("resume cần --run <mã lần chạy>", 2);
      let group = c.group;
      if (resume && !group) {
        const state = JSON.parse(fs.readFileSync(path.join(importDirs(dataDir).runs, runArg!, "state.json"), "utf8")) as { group: string; kinds: Kind[] };
        group = resolveGroup(state.group);
        c.kinds = state.kinds;
      }
      if (!group) fail(`Thiếu hoặc sai --group. Nhóm có sẵn: ${Object.keys(GROUPS).join(", ")}`, 2);
      const dryRun = a.cmd === "plan" || (a.cmd === "apply" && !a.flags.has("yes"));
      if (a.cmd === "apply" && dryRun) console.log("(Chưa có --yes → chỉ CHẠY THỬ. Thêm --yes để ghi thật.)\n");
      const res = await runImport(
        { datasetDir: c.datasetDir, group, kinds: c.kinds, limit: c.limit, translationsFile: c.translationsFile, maxSentencesPerWord: c.maxSentencesPerWord, runId: runArg ?? (str(a, "run-id") ?? undefined), dryRun, dataDir, seedDir, resume },
        store,
        (l) => console.log(l),
      );
      console.log("");
      for (const k of res.plan.kinds) {
        const x = res.report.counts[k];
        console.log(`${k.padEnd(10)} thêm ${x.created} · cập nhật ${x.updated} · bỏ qua ${x.skipped} · lỗi ${x.errors}${x.refused ? " · TỪ CHỐI" : ""}`);
        for (const b of res.report.skipBreakdown[k].slice(0, 6)) console.log(`             - ${b.count} × ${SKIP_REASON_LABELS[b.reason]}`);
      }
      console.log(`\nBáo cáo: ${res.reportFiles.md}`);
      if (res.report.backupDir) console.log(`Sao lưu: ${res.report.backupDir}`);
      if (res.report.counts.vocabulary.refused || res.report.counts.kanji.refused || res.report.counts.sentences.refused) process.exitCode = 1;
      return;
    }

    case "rollback": {
      const run = str(a, "run");
      if (!run) fail("rollback cần --run <mã lần chạy>", 2);
      const dry = !a.flags.has("yes");
      const r = await rollbackRun(run, dataDir, store, dry);
      console.log(`${dry ? "(chạy thử — thêm --yes để thực hiện) " : ""}Xóa ${r.removed.length} bản ghi do lần nhập tạo, khôi phục ${r.restored.length} bản ghi đã cập nhật, giữ nguyên ${r.kept.length}.`);
      for (const k of r.kept.slice(0, 20)) console.log(`  giữ ${k.kind}/${k.id}: ${k.reason}`);
      return;
    }

    case "backup": {
      const dest = path.join(importDirs(dataDir).backups, `manual-${makeRunId("manual", new Date())}`);
      const b = await backupDataDir(dataDir, dest);
      console.log(`Đã sao lưu ${b.files.length} file vào ${dest}${b.absent.length ? `\n(Chưa có file riêng cho: ${b.absent.join(", ")} — đang dùng dữ liệu mẫu.)` : ""}`);
      return;
    }

    case "translate-export": {
      const c = common(a);
      if (!c.group) fail("Thiếu --group", 2);
      const out = str(a, "out") ?? path.join(importDirs(dataDir).root, `to-translate-${c.group.id}.jsonl`);
      const { planImport } = await import("../src/lib/import/plan");
      const [vocabulary, kanji, sentences, sources] = await Promise.all([store.list("vocabulary"), store.list("kanji"), store.list("sentences"), store.list("sources")]);
      const seedSources = JSON.parse(fs.readFileSync(path.join(seedDir, "sources.json"), "utf8"));
      const plan = await planImport(
        { datasetDir: c.datasetDir, group: c.group, kinds: c.kinds, limit: c.limit, runId: "export", now: new Date().toISOString(), maxSentencesPerWord: c.maxSentencesPerWord },
        { vocabulary, kanji, sentences, sources, seedSources } as never,
      );
      const lines: string[] = [];
      const seen = new Set<string>();
      const hasVi = (k: Kind, r: Record<string, unknown>) =>
        k === "sentences" ? ((r.translations as { lang: string }[] | undefined) ?? []).some((t) => t.lang === "vi") : String(r.meaning_vi ?? "").trim() !== "";
      const push = (k: Kind, rec: Record<string, unknown>) => {
        const key = `${k}/${String(rec.id)}`;
        if (seen.has(key) || hasVi(k, rec)) return;
        seen.add(key);
        if (k === "sentences") {
          const en = (rec.translations as { lang: string; text: string }[]).find((t) => t.lang === "en")?.text ?? "";
          lines.push(JSON.stringify({ collection: k, id: rec.id, ja: rec.ja, en, vi: "" }));
        } else if (k === "kanji") lines.push(JSON.stringify({ collection: k, id: rec.id, char: rec.char, en: rec.meanings_en, vi: "" }));
        else lines.push(JSON.stringify({ collection: k, id: rec.id, word: rec.word, reading: rec.reading, en: (rec.senses as { glosses: { lang: string; text: string }[] }[]).map((x) => x.glosses.filter((g) => g.lang === "en").map((g) => g.text).join("; ")), vi: "" }));
      };
      // 1) mục sẽ được thêm mới trong lần nhập này; 2) mục đã nhập trước đó nhưng vẫn chưa có tiếng Việt
      for (const k of plan.kinds) for (const r of plan.collections[k].creates) push(k, r as Record<string, unknown>);
      const levels = new Set<string>(c.group.levels);
      for (const k of plan.kinds) {
        const stored = (k === "vocabulary" ? vocabulary : k === "kanji" ? kanji : sentences) as unknown as Record<string, unknown>[];
        for (const r of stored) if (r.import && (k === "sentences" || levels.has(String(r.level)))) push(k, r);
      }
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, lines.join("\n") + (lines.length ? "\n" : ""));
      console.log(`Đã xuất ${lines.length} mục chưa có trong kho (cần dịch) → ${out}\nĐiền trường "vi" rồi nạp bằng --translations. Mọi bản dịch sẽ được gắn nhãn "dịch máy – chưa kiểm tra".`);
      return;
    }

    case "export-base": {
      // Đọc từ thư mục dữ liệu (NC_DATA_DIR hoặc --from), ghi vào content/imported (hoặc --out). Không sửa dữ liệu nguồn.
      const fromDir = path.resolve(str(a, "from") ?? dataDir);
      const outDir = path.resolve(str(a, "out") ?? path.join(root, "content", "imported"));
      const readJson = (f: string): Record<string, unknown>[] => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as Record<string, unknown>[]) : []);
      const records = {} as Record<BaseCollection, never[]>;
      const seedIds = {} as Record<BaseCollection, Set<string>>;
      for (const c of BASE_COLLECTIONS) {
        records[c] = readJson(path.join(fromDir, `${c}.json`)) as never[];
        seedIds[c] = new Set(readJson(path.join(seedDir, `${c}.json`)).map((r) => String(r.id)));
      }
      let result;
      try {
        result = buildBaseExport(records, seedIds);
      } catch (e) {
        if (e instanceof ExportError) fail(e.message);
        throw e;
      }
      const total = BASE_COLLECTIONS.reduce((s, c) => s + result.manifest.counts[c], 0);
      if (total === 0) fail(`Không có bản ghi nào mang dấu vết nhập trong ${fromDir}. Hãy chạy import:apply trước (xem docs/CAP-NHAT-DU-LIEU.md).`);
      if (!a.flags.has("yes")) {
        console.log(`Chạy thử (thêm --yes để ghi). Sẽ ghi vào ${outDir}:`);
        for (const c of BASE_COLLECTIONS) console.log(`  ${c}: ${result.manifest.counts[c]} bản ghi`);
        for (const w of result.manifest.warnings) console.log(`  ⚠ ${w}`);
        return;
      }
      fs.mkdirSync(outDir, { recursive: true });
      const write = (name: string, body: string) => {
        const f = path.join(outDir, name);
        const tmp = `${f}.tmp`;
        fs.writeFileSync(tmp, body, "utf8");
        fs.renameSync(tmp, f);
      };
      for (const c of BASE_COLLECTIONS) {
        write(`${c}.json`, JSON.stringify(result.data[c]) + "\n");
        const kb = Math.round(fs.statSync(path.join(outDir, `${c}.json`)).size / 1024);
        console.log(`✓ ${c}.json — ${result.manifest.counts[c]} bản ghi (${kb} KB)`);
      }
      write("manifest.json", JSON.stringify(result.manifest, null, 2) + "\n");
      for (const w of result.manifest.warnings) console.log(`⚠ ${w}`);
      console.log(`✓ manifest.json — dữ liệu nguồn: ${result.manifest.dataset_versions.join(", ") || "?"}`);
      return;
    }

    case "quality": {
      const data = Object.fromEntries(await Promise.all((["sources", "images", "vocabulary", "kanji", "sentences"] as const).map(async (c) => [c, await store.list(c)] as const)));
      const report = runQualityChecks(data as never, { publicDir: path.join(root, "public"), dataDir });
      if (a.flags.has("json")) console.log(JSON.stringify(report, null, 2));
      else console.log(renderQualityText(report));
      if (report.summary.errors > 0 && a.flags.has("strict")) process.exit(1);
      return;
    }

    default:
      printHelp();
      fail(`Lệnh không hợp lệ: ${a.cmd}`, 2);
  }
}

main().catch((e) => {
  if (e instanceof ImportAbort) fail(e.message);
  console.error(e);
  process.exit(1);
});
