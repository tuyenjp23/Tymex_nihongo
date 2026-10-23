import fs from "node:fs";
import path from "node:path";
import { LEVELS, type CollectionKey, type Level } from "../types";
import type { Source } from "../schemas";
import { validateRecord, type FieldError, type IdSets } from "../admin/validate";
import { recordBaseHash } from "./hash";
import { decideMerge } from "./merge";
import {
  SRC,
  isSkip,
  normalizeKanji,
  normalizeSentence,
  normalizeWord,
  sentenceDedupeKey,
  wordKey,
  type NormalizeCtx,
  type RawKanji,
  type RawSentence,
  type RawWord,
  type SkipReason,
  type WordSentenceLink,
} from "./normalize";
import { readMetadata, sha256File, streamDataset } from "./stream-json";
import { applyTranslation, translationKey, type TranslationLoad } from "./translations";

type Rec = Record<string, unknown>;

/* ───────────── Nhóm nhập & tệp nguồn ───────────── */

export const KINDS = ["vocabulary", "kanji", "sentences"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABELS: Record<Kind, string> = { vocabulary: "Từ vựng", kanji: "Kanji", sentences: "Câu ví dụ" };

export interface GroupDef {
  id: string;
  title: string;
  levels: Level[];
}

/** Mỗi nhóm = một cấp JLPT (theo danh sách cộng đồng). Nhập từng nhóm một để kiểm tra rồi mới mở rộng. */
export const GROUPS: Record<string, GroupDef> = Object.fromEntries(
  LEVELS.map((l) => [`jlpt-${l.toLowerCase()}`, { id: `jlpt-${l.toLowerCase()}`, title: `Từ vựng/Kanji/câu ví dụ cấp ${l} (danh sách JLPT cộng đồng)`, levels: [l] as Level[] }]),
);

export function resolveGroup(id: string): GroupDef | null {
  return GROUPS[id.trim().toLowerCase()] ?? null;
}

export const DATASET_FILES = {
  words: { rel: path.join("data", "core", "words.json"), key: "words" },
  kanji: { rel: path.join("data", "core", "kanji.json"), key: "kanji" },
  sentences: { rel: path.join("data", "corpus", "sentences.json"), key: "sentences" },
} as const;
type FileKey = keyof typeof DATASET_FILES;

/** Mỗi loại bản ghi cần những nguồn nào được phép nhập (xem import_policy trong sổ nguồn). */
export const REQUIRED_SOURCES: Record<Kind, string[]> = {
  vocabulary: [SRC.jmdict, SRC.waller],
  kanji: [SRC.kanjidic, SRC.waller],
  sentences: [SRC.tatoeba],
};

/* ───────────── Kiểm tra bộ dữ liệu (phiên bản + giấy phép) ───────────── */

export interface DatasetFileInfo {
  path: string;
  exists: boolean;
  license: string;
  sourceVersion: string;
  dictDate: string;
  count: number | null;
  bytes: number;
  sha256?: string;
}

export interface DatasetInfo {
  dir: string;
  manifestVersion: string;
  manifestLicense: string;
  generated: string;
  datasetVersion: string;
  files: Record<FileKey, DatasetFileInfo>;
  /** Vấn đề chặn nhập (giấy phép không khớp, thiếu file…) */
  problems: string[];
  warnings: string[];
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export async function inspectDataset(dir: string, opts: { hashes?: boolean; registered?: Map<string, Source> } = {}): Promise<DatasetInfo> {
  const info: DatasetInfo = {
    dir,
    manifestVersion: "",
    manifestLicense: "",
    generated: "",
    datasetVersion: "",
    files: {} as Record<FileKey, DatasetFileInfo>,
    problems: [],
    warnings: [],
  };
  const manifestFile = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestFile)) {
    info.problems.push(`Không thấy manifest.json trong ${dir} — không xác định được phiên bản và giấy phép của bộ dữ liệu.`);
  } else {
    try {
      const m = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as Record<string, unknown>;
      info.manifestVersion = str(m.version);
      info.manifestLicense = str(m.license);
      info.generated = str(m.generated);
      if (!/CC-BY-SA 4\.0/i.test(info.manifestLicense))
        info.problems.push(`Giấy phép trong manifest.json là "${info.manifestLicense || "(trống)"}", không phải CC-BY-SA 4.0 như đã kiểm tra — dừng nhập, hãy đọc lại điều khoản của phiên bản này.`);
    } catch (e) {
      info.problems.push(`manifest.json không đọc được: ${(e as Error).message}`);
    }
  }

  for (const k of Object.keys(DATASET_FILES) as FileKey[]) {
    const f = path.join(dir, DATASET_FILES[k].rel);
    const fi: DatasetFileInfo = { path: f, exists: fs.existsSync(f), license: "", sourceVersion: "", dictDate: "", count: null, bytes: 0 };
    info.files[k] = fi;
    if (!fi.exists) {
      info.problems.push(`Thiếu file ${DATASET_FILES[k].rel}`);
      continue;
    }
    fi.bytes = fs.statSync(f).size;
    try {
      const md = await readMetadata(f, DATASET_FILES[k].key);
      fi.license = str(md.license);
      fi.sourceVersion = str(md.source_version);
      fi.dictDate = str(md.upstream_dict_date);
      fi.count = typeof md.count === "number" ? md.count : null;
    } catch (e) {
      info.problems.push(`${DATASET_FILES[k].rel}: không đọc được metadata (${(e as Error).message})`);
      continue;
    }
    const okLicense = k === "sentences" ? /CC-BY 2\.0|CC0/i.test(fi.license) : /CC-BY-SA 4\.0/i.test(fi.license);
    if (!okLicense) info.problems.push(`${DATASET_FILES[k].rel}: giấy phép "${fi.license || "(trống)"}" không khớp giấy phép đã kiểm tra — dừng nhập.`);
    if (opts.hashes) fi.sha256 = await sha256File(f);
  }

  const w = info.files.words;
  info.datasetVersion = `jld-${info.manifestVersion || "?"}/jmdict-simplified-${w?.sourceVersion || "?"}/${w?.dictDate || "?"}`.slice(0, 80);

  const reg = opts.registered?.get(SRC.dataset);
  if (reg && info.manifestVersion && reg.version && !reg.version.includes(info.manifestVersion))
    info.warnings.push(`Phiên bản bộ dữ liệu (${info.manifestVersion}) khác phiên bản đã đăng ký trong sổ nguồn ("${reg.version}"). Hãy kiểm tra lại giấy phép/điều khoản rồi cập nhật sổ nguồn.`);
  return info;
}

/* ───────────── Kết quả kế hoạch ───────────── */

export interface SkipEntry {
  id: string;
  reason: SkipReason;
  detail?: string;
}
export interface ErrorEntry {
  id: string;
  errors: FieldError[];
}
export interface CollectionPlan {
  kind: Kind;
  /** Lý do cả nhóm bị từ chối (ví dụ nguồn bị chặn) */
  refused: string | null;
  /** Số mục đã đọc từ file nguồn */
  seen: number;
  /** Mục nằm ngoài nhóm (khác cấp JLPT hoặc không có cấp) — không phải lỗi, không nhập */
  outOfScope: Record<string, number>;
  /** Số mục thuộc nhóm đã được xử lý */
  considered: number;
  creates: Rec[];
  updates: { before: Rec; after: Rec }[];
  skips: SkipEntry[];
  skipCounts: Partial<Record<SkipReason, number>>;
  errors: ErrorEntry[];
  /** Mục hợp lệ nhưng không được chọn (vượt giới hạn số câu mỗi từ) */
  notSelected: number;
  stoppedEarly: boolean;
  notes: string[];
}

export interface ImportPlan {
  runId: string;
  group: GroupDef;
  kinds: Kind[];
  limit: number | null;
  dataset: DatasetInfo;
  collections: Record<Kind, CollectionPlan>;
  sourcesUsed: string[];
  /** Bản ghi nguồn có trong bản mẫu nhưng chưa có trong kho → sẽ được thêm (không ghi đè nguồn có sẵn) */
  sourcesToAdd: Rec[];
  translations: { provided: number; applied: number; unused: number; errors: number };
  homographs: number;
}

export interface PlanOptions {
  datasetDir: string;
  group: GroupDef;
  kinds: Kind[];
  limit?: number | null;
  maxSentencesPerWord?: number;
  runId: string;
  now: string;
  translations?: TranslationLoad;
  hashes?: boolean;
}

export interface ExistingData {
  vocabulary: Rec[];
  kanji: Rec[];
  sentences: Rec[];
  sources: Rec[];
  /** Các nguồn trong bản mẫu của app (dùng để bổ sung nguồn còn thiếu) */
  seedSources: Rec[];
}

const emptyPlan = (kind: Kind): CollectionPlan => ({ kind, refused: null, seen: 0, outOfScope: {}, considered: 0, creates: [], updates: [], skips: [], skipCounts: {}, errors: [], notSelected: 0, stoppedEarly: false, notes: [] });

function addSkip(p: CollectionPlan, id: string, reason: SkipReason, detail?: string) {
  p.skips.push({ id, reason, detail });
  p.skipCounts[reason] = (p.skipCounts[reason] ?? 0) + 1;
}

const imp = (r: Rec) => (r.import && typeof r.import === "object" ? (r.import as Rec) : null);

/** Kiểm tra nguồn có được phép nhập không. Trả về lý do từ chối hoặc null. */
export function sourceGate(kind: Kind, sources: Map<string, Source>): string | null {
  for (const id of REQUIRED_SOURCES[kind]) {
    const s = sources.get(id);
    if (!s) return `Nguồn "${id}" chưa có trong sổ nguồn học liệu`;
    if (s.import_policy !== "allowed") return `Nguồn "${s.source_name}" (${id}) chưa được đánh dấu "Được phép nhập" nên bị từ chối`;
    if (s.reuse_allowed === "no" || s.reuse_allowed === "unknown") return `Nguồn "${s.source_name}" (${id}) chưa xác nhận được quyền dùng lại nội dung`;
  }
  return null;
}

/* ───────────── Lập kế hoạch ───────────── */

/**
 * Đọc bộ dữ liệu theo dòng chảy và lập kế hoạch nhập — KHÔNG ghi gì. Dùng cho cả `plan` (dry-run) và `apply`.
 * `existing` là dữ liệu hiện có trong kho (đọc một lần).
 */
export async function planImport(opts: PlanOptions, existing: ExistingData): Promise<ImportPlan> {
  const dataset = await inspectDataset(opts.datasetDir, { hashes: opts.hashes, registered: new Map(existing.sources.map((s) => [String(s.id), s as unknown as Source])) });
  const kinds = KINDS.filter((k) => opts.kinds.includes(k));
  const plan: ImportPlan = {
    runId: opts.runId,
    group: opts.group,
    kinds,
    limit: opts.limit ?? null,
    dataset,
    collections: { vocabulary: emptyPlan("vocabulary"), kanji: emptyPlan("kanji"), sentences: emptyPlan("sentences") },
    sourcesUsed: [],
    sourcesToAdd: [],
    translations: { provided: opts.translations?.map.size ?? 0, applied: 0, unused: 0, errors: opts.translations?.errors.length ?? 0 },
    homographs: 0,
  };
  if (dataset.problems.length > 0) {
    for (const k of kinds) plan.collections[k].refused = dataset.problems.join(" | ");
    return plan;
  }

  // Sổ nguồn: bản trong kho được ưu tiên; nguồn còn thiếu lấy từ bản mẫu
  const sources = new Map<string, Source>(existing.sources.map((s) => [String(s.id), s as unknown as Source]));
  const seedById = new Map(existing.seedSources.map((s) => [String(s.id), s]));
  const needed = new Set<string>([SRC.dataset]);
  for (const k of kinds) REQUIRED_SOURCES[k].forEach((id) => needed.add(id));
  for (const id of needed)
    if (!sources.has(id) && seedById.has(id)) {
      sources.set(id, seedById.get(id) as unknown as Source);
      plan.sourcesToAdd.push(seedById.get(id)!);
    }
  const sourcesCtx = new Set(sources.keys());

  const gated = new Map<Kind, string | null>();
  for (const k of kinds) {
    const why = sourceGate(k, sources);
    gated.set(k, why);
    if (why) plan.collections[k].refused = why;
  }
  const ok = (k: Kind) => kinds.includes(k) && !gated.get(k);
  plan.sourcesUsed = [...needed].filter((id) => sources.has(id));

  const nctx: NormalizeCtx = { runId: opts.runId, now: opts.now, datasetVersion: dataset.datasetVersion };
  const tr = opts.translations?.map ?? new Map();
  const usedTr = new Set<string>();
  const limit = opts.limit && opts.limit > 0 ? opts.limit : null;
  const groupLevels = new Set<string>(opts.group.levels);

  const vctx = (ids: IdSets) => ({ sources, ids: { sources: sourcesCtx, images: new Set<string>(), ...ids } as IdSets });
  const validateFinal = (collection: CollectionKey, rec: Rec, ids: IdSets): { ok: true; record: Rec } | { ok: false; errors: FieldError[] } => {
    const res = validateRecord(collection, rec, vctx(ids), { now: opts.now });
    if (!res.ok) return res;
    const record = res.record as Rec;
    // Giữ created_at theo bản gốc nếu có (store cũng giữ); đóng dấu base_hash để về sau phát hiện sửa tay
    const meta = { ...(imp(record) ?? {}) };
    meta.base_hash = recordBaseHash(record);
    return { ok: true, record: { ...record, import: meta } };
  };

  /* ── Từ vựng ── */
  const needWords = ok("vocabulary") || ok("sentences");
  const vocabPlan = plan.collections.vocabulary;
  const existingVocab = new Map(existing.vocabulary.map((r) => [String(r.id), r]));
  const manualVocabKeys = new Map<string, string>();
  for (const r of existing.vocabulary) if (!imp(r)) manualVocabKeys.set(wordKey(str(r.word), str(r.reading)), String(r.id));
  let droppedSenses = 0;
  const plannedKeys = new Set<string>();
  const finalVocabIds = new Set<string>(existing.vocabulary.map((r) => String(r.id)));
  /** sentenceId → { văn bản nhúng trong JMdict, các ID từ trong kho sẽ trỏ tới câu này } */
  const links = new Map<string, { ja: string; en: string; refs: Set<string> }>();
  const addLink = (l: WordSentenceLink, vocabId: string) => {
    const cur = links.get(l.sentenceId) ?? { ja: l.japanese, en: l.english, refs: new Set<string>() };
    cur.refs.add(vocabId);
    links.set(l.sentenceId, cur);
  };

  if (needWords) {
    const writeVocab = ok("vocabulary");
    for await (const ev of streamDataset(plan.dataset.files.words.path, DATASET_FILES.words.key)) {
      if (ev.kind !== "item") continue;
      vocabPlan.seen++;
      const raw = ev.value as RawWord;
      const lv = str(raw.jlpt_waller) || "(không có cấp)";
      if (!groupLevels.has(str(raw.jlpt_waller))) {
        vocabPlan.outOfScope[lv] = (vocabPlan.outOfScope[lv] ?? 0) + 1;
        continue;
      }
      if (limit && vocabPlan.considered >= limit) {
        vocabPlan.stoppedEarly = true;
        break;
      }
      vocabPlan.considered++;
      const id = `jm-${str(raw.id)}`;
      const norm = normalizeWord(raw, nctx);
      if (isSkip(norm)) {
        if (writeVocab) addSkip(vocabPlan, id, norm.skip, norm.detail);
        continue;
      }
      droppedSenses += norm.droppedSenses;
      let rec = norm.record;
      const trKey = translationKey("vocabulary", id);
      if (tr.has(trKey)) {
        rec = applyTranslation("vocabulary", rec, tr.get(trKey)!);
        usedTr.add(trKey);
      }
      const linkTarget = (vocabId: string) => norm.sentenceLinks.forEach((l) => addLink(l, vocabId));

      const before = existingVocab.get(id);
      if (before) {
        // cùng ID: theo chính sách gộp
        const d = decideMerge(before, rec);
        linkTarget(id);
        if (!writeVocab) continue;
        if (d.action === "skip") addSkip(vocabPlan, id, d.reason, d.detail);
        else if (d.action === "update") {
          const v = validateFinal("vocabulary", d.record, {});
          if (v.ok) vocabPlan.updates.push({ before, after: v.record });
          else vocabPlan.errors.push({ id, errors: v.errors });
        }
        continue;
      }
      const key = wordKey(str(rec.word), str(rec.reading));
      const manualId = manualVocabKeys.get(key);
      if (manualId) {
        // Đã có từ do người soạn tạo cùng chữ + cách đọc → giữ bản có sẵn, vẫn gắn câu ví dụ vào bản đó
        linkTarget(manualId);
        if (writeVocab) addSkip(vocabPlan, id, "exists_in_seed_same_word", manualId);
        continue;
      }
      if (!writeVocab) continue; // chỉ cần liên kết, không tạo từ
      const v = validateFinal("vocabulary", rec, {});
      if (!v.ok) {
        vocabPlan.errors.push({ id, errors: v.errors });
        continue;
      }
      if (plannedKeys.has(key)) plan.homographs++;
      plannedKeys.add(key);
      vocabPlan.creates.push(v.record);
      finalVocabIds.add(id);
      linkTarget(id);
    }
    if (droppedSenses > 0) vocabPlan.notes.push(`${droppedSenses} nghĩa bị lọc vì có thẻ tục tĩu/nhạy cảm của JMdict (hoặc nghĩa uyển ngữ chỉ bộ phận kín). Đây chỉ là bộ lọc cơ bản — vẫn cần rà soát nội dung.`);
    if (vocabPlan.stoppedEarly) vocabPlan.notes.push(`Dừng sớm do --limit ${limit}: chỉ xử lý ${limit} mục đầu tiên thuộc nhóm (theo thứ tự trong file).`);
    if (plan.homographs > 0) vocabPlan.notes.push(`${plan.homographs} từ có cùng chữ + cách đọc với một mục khác trong cùng lần nhập — giữ riêng vì là các mục JMdict khác nhau (không gộp).`);
  }

  /* ── Kanji ── */
  const kanjiPlan = plan.collections.kanji;
  if (ok("kanji")) {
    const existingKanji = new Map(existing.kanji.map((r) => [String(r.id), r]));
    const manualChars = new Map<string, string>();
    for (const r of existing.kanji) if (!imp(r)) manualChars.set(str(r.char), String(r.id));
    for await (const ev of streamDataset(plan.dataset.files.kanji.path, DATASET_FILES.kanji.key)) {
      if (ev.kind !== "item") continue;
      kanjiPlan.seen++;
      const raw = ev.value as RawKanji;
      const lv = str(raw.jlpt_waller) || "(không có cấp)";
      if (!groupLevels.has(str(raw.jlpt_waller))) {
        kanjiPlan.outOfScope[lv] = (kanjiPlan.outOfScope[lv] ?? 0) + 1;
        continue;
      }
      if (limit && kanjiPlan.considered >= limit) {
        kanjiPlan.stoppedEarly = true;
        break;
      }
      kanjiPlan.considered++;
      const norm = normalizeKanji(raw, nctx);
      const id = `kj-${str(raw.unicode).toLowerCase()}`;
      if (isSkip(norm)) {
        addSkip(kanjiPlan, id, norm.skip, norm.detail);
        continue;
      }
      let rec = norm.record;
      const trKey = translationKey("kanji", id);
      if (tr.has(trKey)) {
        rec = applyTranslation("kanji", rec, tr.get(trKey)!);
        usedTr.add(trKey);
      }
      const before = existingKanji.get(id);
      if (before) {
        const d = decideMerge(before, rec);
        if (d.action === "skip") addSkip(kanjiPlan, id, d.reason, d.detail);
        else if (d.action === "update") {
          const v = validateFinal("kanji", d.record, {});
          if (v.ok) kanjiPlan.updates.push({ before, after: v.record });
          else kanjiPlan.errors.push({ id, errors: v.errors });
        }
        continue;
      }
      const manual = manualChars.get(str(rec.char));
      if (manual) {
        addSkip(kanjiPlan, id, "exists_in_seed_same_word", manual);
        continue;
      }
      const v = validateFinal("kanji", rec, {});
      if (v.ok) kanjiPlan.creates.push(v.record);
      else kanjiPlan.errors.push({ id, errors: v.errors });
    }
    if (kanjiPlan.stoppedEarly) kanjiPlan.notes.push(`Dừng sớm do --limit ${limit}.`);
  }

  /* ── Câu ví dụ ── */
  const sentPlan = plan.collections.sentences;
  if (ok("sentences")) {
    const wanted = new Set(links.keys());
    const canonical = new Map<string, { ja: string; en: string }>();
    if (wanted.size > 0) {
      for await (const ev of streamDataset(plan.dataset.files.sentences.path, DATASET_FILES.sentences.key)) {
        if (ev.kind !== "item") continue;
        sentPlan.seen++;
        const raw = ev.value as RawSentence;
        const id = str(raw.id);
        if (wanted.has(id)) {
          canonical.set(id, { ja: str(raw.japanese), en: str(raw.english) });
          if (canonical.size === wanted.size) break;
        }
      }
    }
    const fallback = [...wanted].filter((id) => !canonical.has(id)).length;
    if (fallback > 0) sentPlan.notes.push(`${fallback} câu không thấy trong kho câu Tatoeba của bộ dữ liệu → dùng văn bản nhúng trong mục JMdict.`);

    const existingSent = new Map(existing.sentences.map((r) => [String(r.id), r]));
    const numeric = (id: string) => Number(id.replace(/\D/g, "")) || 0;
    const orderedIds = [...wanted].sort((a, b) => numeric(a) - numeric(b));

    // 1) chuẩn hóa + lọc chất lượng + loại trùng nội dung
    const valid = new Map<string, { record: Rec; refs: Set<string> }>();
    const byKey = new Map<string, string>();
    for (const id of orderedIds) {
      const l = links.get(id)!;
      const text = canonical.get(id) ?? { ja: l.ja, en: l.en };
      sentPlan.considered++;
      const norm = normalizeSentence({ id, japanese: text.ja, english: text.en }, nctx);
      if (isSkip(norm)) {
        addSkip(sentPlan, id, norm.skip, norm.detail);
        continue;
      }
      const key = sentenceDedupeKey(str(norm.record.ja));
      const keptId = byKey.get(key);
      if (keptId) {
        valid.get(keptId)!.refs = new Set([...valid.get(keptId)!.refs, ...l.refs]);
        addSkip(sentPlan, id, "duplicate_text", `trùng với ${keptId}`);
        continue;
      }
      byKey.set(key, id);
      valid.set(id, { record: norm.record, refs: new Set(l.refs) });
    }
    // trùng với câu đã có trong kho (khác ID) → không thêm
    const existingKeys = new Map<string, string>();
    for (const r of existing.sentences) existingKeys.set(sentenceDedupeKey(str(r.ja)), String(r.id));
    for (const [id, v] of [...valid]) {
      const dupe = existingKeys.get(sentenceDedupeKey(str(v.record.ja)));
      if (dupe && dupe !== id) {
        valid.delete(id);
        addSkip(sentPlan, id, "duplicate_text", `trùng với câu có sẵn ${dupe}`);
      }
    }

    // 2) mỗi từ chọn tối đa N câu, ưu tiên độ dài vừa học (~18 ký tự)
    const maxPer = Math.max(1, opts.maxSentencesPerWord ?? 3);
    const byWord = new Map<string, string[]>();
    for (const [sid, v] of valid) for (const ref of v.refs) byWord.set(ref, [...(byWord.get(ref) ?? []), sid]);
    const selected = new Set<string>();
    for (const [, sids] of byWord) {
      const ranked = [...sids].sort((a, b) => Math.abs([...str(valid.get(a)!.record.ja)].length - 18) - Math.abs([...str(valid.get(b)!.record.ja)].length - 18) || numeric(a) - numeric(b));
      ranked.slice(0, maxPer).forEach((s) => selected.add(s));
    }
    // câu đã nhập ở lần trước và không bị sửa vẫn phải được xét (idempotent) → luôn giữ nếu đã có trong kho
    for (const id of valid.keys()) if (existingSent.has(id)) selected.add(id);

    for (const id of orderedIds) {
      const v = valid.get(id);
      if (!v) continue;
      if (!selected.has(id)) {
        sentPlan.notSelected++;
        continue;
      }
      const refs = [...v.refs].filter((r) => finalVocabIds.has(r)).slice(0, 40);
      if (refs.length === 0) {
        addSkip(sentPlan, id, "no_linked_word");
        continue;
      }
      let rec: Rec = { ...v.record, word_refs: refs };
      const trKey = translationKey("sentences", id);
      if (tr.has(trKey)) {
        rec = applyTranslation("sentences", rec, tr.get(trKey)!);
        usedTr.add(trKey);
      }
      const before = existingSent.get(id);
      const ids: IdSets = { vocabulary: finalVocabIds };
      if (before) {
        const d = decideMerge(before, rec);
        if (d.action === "skip") addSkip(sentPlan, id, d.reason, d.detail);
        else if (d.action === "update") {
          const res = validateFinal("sentences", d.record, ids);
          if (res.ok) sentPlan.updates.push({ before, after: res.record });
          else sentPlan.errors.push({ id, errors: res.errors });
        }
        continue;
      }
      const res = validateFinal("sentences", rec, ids);
      if (res.ok) sentPlan.creates.push(res.record);
      else sentPlan.errors.push({ id, errors: res.errors });
    }
    if (sentPlan.notSelected > 0) sentPlan.notes.push(`${sentPlan.notSelected} câu hợp lệ nhưng không được chọn (giới hạn ${maxPer} câu mỗi từ, ưu tiên câu có độ dài vừa học).`);
  }

  plan.translations.applied = usedTr.size;
  plan.translations.unused = [...tr.keys()].filter((k) => !usedTr.has(k)).length;
  return plan;
}

/** Tóm tắt số lượng — dùng cho báo cáo và CLI. */
export function summarize(plan: ImportPlan) {
  return Object.fromEntries(
    KINDS.map((k) => {
      const c = plan.collections[k];
      return [k, { created: c.creates.length, updated: c.updates.length, skipped: c.skips.length, errors: c.errors.length, seen: c.seen, considered: c.considered, refused: c.refused }];
    }),
  ) as Record<Kind, { created: number; updated: number; skipped: number; errors: number; seen: number; considered: number; refused: string | null }>;
}
