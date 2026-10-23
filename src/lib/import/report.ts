import { SKIP_REASON_LABELS, type SkipReason } from "./normalize";
import { KINDS, KIND_LABELS, summarize, type ImportPlan, type Kind } from "./plan";
import type { Source } from "../schemas";

export interface WriteResult {
  written: number;
  verified: number;
  mismatched: string[];
  batches: number;
}

export interface RunReport {
  runId: string;
  mode: "dry-run" | "apply";
  startedAt: string;
  finishedAt: string;
  group: string;
  kinds: Kind[];
  limit: number | null;
  dataset: { version: string; manifestVersion: string; license: string; generated: string; dir: string; files: { name: string; bytes: number; sha256?: string; license: string }[] };
  counts: ReturnType<typeof summarize>;
  skipBreakdown: Record<Kind, { reason: SkipReason; label: string; count: number }[]>;
  outOfScope: Record<Kind, Record<string, number>>;
  notes: string[];
  errorSamples: { kind: Kind; id: string; errors: string[] }[];
  skipSamples: { kind: Kind; id: string; reason: SkipReason; detail?: string }[];
  translations: ImportPlan["translations"];
  sources: { id: string; name: string; license: string; version: string; attribution: string; policy: string }[];
  sourcesAdded: string[];
  written: Partial<Record<Kind, WriteResult>>;
  backupDir: string | null;
  warnings: string[];
  /** Câu khẳng định trung thực về nguồn dữ liệu của lần chạy */
  provenanceStatement: string;
}

export function buildReport(
  plan: ImportPlan,
  extra: { mode: "dry-run" | "apply"; startedAt: string; finishedAt: string; sources: Map<string, Source>; written?: Partial<Record<Kind, WriteResult>>; backupDir?: string | null; warnings?: string[] },
): RunReport {
  const ds = plan.dataset;
  const breakdown = {} as RunReport["skipBreakdown"];
  const oos = {} as RunReport["outOfScope"];
  const errorSamples: RunReport["errorSamples"] = [];
  const skipSamples: RunReport["skipSamples"] = [];
  const notes: string[] = [];
  for (const k of KINDS) {
    const c = plan.collections[k];
    breakdown[k] = (Object.entries(c.skipCounts) as [SkipReason, number][]).map(([reason, count]) => ({ reason, label: SKIP_REASON_LABELS[reason], count })).sort((a, b) => b.count - a.count);
    oos[k] = c.outOfScope;
    for (const e of c.errors.slice(0, 15)) errorSamples.push({ kind: k, id: e.id, errors: e.errors.map((x) => `${x.path || "(chung)"}: ${x.message}`) });
    const seenReasons = new Set<string>();
    for (const s of c.skips) {
      if (seenReasons.has(s.reason) && skipSamples.filter((x) => x.kind === k && x.reason === s.reason).length >= 3) continue;
      seenReasons.add(s.reason);
      skipSamples.push({ kind: k, id: s.id, reason: s.reason, detail: s.detail });
    }
    if (c.refused) notes.push(`${KIND_LABELS[k]}: BỊ TỪ CHỐI — ${c.refused}`);
    for (const n of c.notes) notes.push(`${KIND_LABELS[k]}: ${n}`);
  }
  if (plan.translations.provided > 0)
    notes.push(`Bản dịch tiếng Việt kèm theo: ${plan.translations.provided} dòng, ${plan.translations.applied} được áp dụng trong lần này (các dòng còn lại thuộc nhóm khác hoặc không khớp mục nào), ${plan.translations.errors} dòng lỗi. Mọi bản dịch đều được gắn nhãn "dịch máy – chưa kiểm tra".`);
  const sources = plan.sourcesUsed
    .map((id) => extra.sources.get(id))
    .filter((s): s is Source => !!s)
    .map((s) => ({ id: s.id, name: s.source_name, license: s.license_name || s.license_note, version: s.version, attribution: s.attribution_text, policy: s.import_policy }));
  return {
    runId: plan.runId,
    mode: extra.mode,
    startedAt: extra.startedAt,
    finishedAt: extra.finishedAt,
    group: plan.group.id,
    kinds: plan.kinds,
    limit: plan.limit,
    dataset: {
      version: ds.datasetVersion,
      manifestVersion: ds.manifestVersion,
      license: ds.manifestLicense,
      generated: ds.generated,
      dir: ds.dir,
      files: Object.values(ds.files).map((f) => ({ name: f.path.split(/[\\/]/).slice(-2).join("/"), bytes: f.bytes, sha256: f.sha256, license: f.license })),
    },
    counts: summarize(plan),
    skipBreakdown: breakdown,
    outOfScope: oos,
    notes,
    errorSamples,
    skipSamples,
    translations: plan.translations,
    sources,
    sourcesAdded: plan.sourcesToAdd.map((s) => String(s.id)),
    written: extra.written ?? {},
    backupDir: extra.backupDir ?? null,
    warnings: [...ds.warnings, ...(extra.warnings ?? [])],
    provenanceStatement:
      "Dữ liệu được đọc từ file có sẵn trong thư mục bộ dữ liệu đã cung cấp (đường dẫn và SHA-256 ở trên); lần chạy này KHÔNG tải gì từ internet.",
  };
}

export function renderMarkdown(r: RunReport): string {
  const L: string[] = [];
  L.push(`# Báo cáo nhập dữ liệu — ${r.runId}`);
  L.push("");
  L.push(`- Chế độ: **${r.mode === "dry-run" ? "CHẠY THỬ (dry-run) — chưa ghi gì vào dữ liệu" : "ĐÃ GHI vào dữ liệu"}**`);
  L.push(`- Nhóm: \`${r.group}\` · Loại: ${r.kinds.map((k) => KIND_LABELS[k]).join(", ")}${r.limit ? ` · giới hạn ${r.limit} mục mỗi loại` : ""}`);
  L.push(`- Bắt đầu: ${r.startedAt} · Kết thúc: ${r.finishedAt}`);
  L.push(`- Bộ dữ liệu: ${r.dataset.version} (manifest ${r.dataset.manifestVersion}, dựng ${r.dataset.generated}), giấy phép ${r.dataset.license}`);
  if (r.backupDir) L.push(`- Bản sao lưu trước khi ghi: \`${r.backupDir}\``);
  L.push(`- ${r.provenanceStatement}`);
  L.push("");
  L.push("## Kết quả");
  L.push("");
  L.push("| Loại | Đã đọc | Thuộc nhóm | Thêm mới | Cập nhật | Bỏ qua | Lỗi |");
  L.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const k of r.kinds) {
    const c = r.counts[k];
    L.push(`| ${KIND_LABELS[k]}${c.refused ? " (bị từ chối)" : ""} | ${c.seen} | ${c.considered} | ${c.created} | ${c.updated} | ${c.skipped} | ${c.errors} |`);
  }
  L.push("");
  for (const k of r.kinds) {
    if (r.skipBreakdown[k].length === 0 && Object.keys(r.outOfScope[k]).length === 0) continue;
    L.push(`### ${KIND_LABELS[k]} — chi tiết`);
    L.push("");
    for (const b of r.skipBreakdown[k]) L.push(`- Bỏ qua ${b.count}: ${b.label}`);
    const oos = Object.entries(r.outOfScope[k]);
    if (oos.length > 0) L.push(`- Ngoài nhóm (không xử lý): ${oos.map(([lv, n]) => `${lv}: ${n}`).join(", ")}`);
    L.push("");
  }
  if (Object.keys(r.written).length > 0) {
    L.push("## Ghi dữ liệu");
    L.push("");
    for (const k of r.kinds) {
      const w = r.written[k];
      if (w) L.push(`- ${KIND_LABELS[k]}: ghi ${w.written} bản ghi (${w.batches} lượt), đọc lại kiểm tra khớp ${w.verified}/${w.written}${w.mismatched.length ? ` — LỆCH: ${w.mismatched.slice(0, 10).join(", ")}` : ""}`);
    }
    L.push("");
  }
  if (r.errorSamples.length > 0) {
    L.push("## Mẫu lỗi (tối đa 15 mỗi loại)");
    L.push("");
    for (const e of r.errorSamples) L.push(`- ${KIND_LABELS[e.kind]} \`${e.id}\`: ${e.errors.join("; ")}`);
    L.push("");
  }
  if (r.notes.length > 0 || r.warnings.length > 0) {
    L.push("## Ghi chú & cảnh báo");
    L.push("");
    for (const n of [...r.warnings, ...r.notes]) L.push(`- ${n}`);
    L.push("");
  }
  L.push("## Nguồn & nghĩa vụ ghi công");
  L.push("");
  for (const s of r.sources) {
    L.push(`- **${s.name}** — ${s.license}${s.version ? `, phiên bản ${s.version}` : ""}`);
    if (s.attribution) L.push(`  - Ghi công: ${s.attribution}`);
  }
  if (r.sourcesAdded.length > 0) L.push(`- Nguồn được thêm vào sổ nguồn lần này: ${r.sourcesAdded.join(", ")}`);
  L.push("");
  L.push("## File nguồn đã dùng");
  L.push("");
  for (const f of r.dataset.files) L.push(`- ${f.name} — ${f.bytes} byte${f.sha256 ? `, SHA-256 ${f.sha256}` : ""} — ${f.license}`);
  L.push("");
  return L.join("\n");
}
