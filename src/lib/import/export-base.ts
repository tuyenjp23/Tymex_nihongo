/**
 * Xuất "dữ liệu nhập sẵn" (BaseLayer) từ một thư mục dữ liệu đã chạy `import:apply`.
 * Chỉ lấy các bản ghi có dấu vết nhập (`import`), ghi gọn (không thụt dòng) vào content/imported/<collection>.json
 * cùng manifest.json mô tả số lượng/phiên bản/nguồn để kiểm tra và ghi công.
 * Hàm thuần (không đọc/ghi file) để test được; phần đọc/ghi nằm ở scripts/import.ts.
 */
import { COLLECTION_SCHEMAS } from "../schemas";
import type { CollectionKey } from "../types";

export const BASE_COLLECTIONS = ["vocabulary", "kanji", "sentences"] as const satisfies readonly CollectionKey[];
export type BaseCollection = (typeof BASE_COLLECTIONS)[number];

type Rec = { id: string; level?: string | null; status?: string; reviewed_by?: string | null; hidden?: boolean; import?: { dataset_version?: string; run_id?: string; source_id?: string } };

export interface BaseManifest {
  generated_at: string;
  note: string;
  counts: Record<BaseCollection, number>;
  by_level: Record<BaseCollection, Record<string, number>>;
  by_status: Record<BaseCollection, Record<string, number>>;
  dataset_versions: string[];
  run_ids: string[];
  source_ids: string[];
  warnings: string[];
}

export interface BaseExport {
  data: Record<BaseCollection, Rec[]>;
  manifest: BaseManifest;
}

export class ExportError extends Error {}

function bump(m: Record<string, number>, k: string) {
  m[k] = (m[k] ?? 0) + 1;
}

/**
 * @param records   bản ghi hiện có theo collection (từ thư mục dữ liệu đã nhập)
 * @param seedIds   ID đã có trong content/seed — bản nhập sẵn KHÔNG được trùng ID với seed
 * @throws ExportError nếu có ID trùng seed/trùng nhau hoặc bản ghi không hợp lệ theo schema
 */
export function buildBaseExport(records: Record<BaseCollection, Rec[]>, seedIds: Record<BaseCollection, Set<string>>, now = new Date()): BaseExport {
  const data = {} as Record<BaseCollection, Rec[]>;
  const manifest: BaseManifest = {
    generated_at: now.toISOString(),
    note: "Dữ liệu nhập từ nguồn mở (JMdict, KANJIDIC2, Tatoeba; cấp độ theo danh sách cộng đồng của Waller — không phải danh sách chính thức của JLPT). Chưa có người rà soát; nghĩa tiếng Việt để trống.",
    counts: { vocabulary: 0, kanji: 0, sentences: 0 },
    by_level: { vocabulary: {}, kanji: {}, sentences: {} },
    by_status: { vocabulary: {}, kanji: {}, sentences: {} },
    dataset_versions: [],
    run_ids: [],
    source_ids: [],
    warnings: [],
  };
  const versions = new Set<string>();
  const runs = new Set<string>();
  const sources = new Set<string>();
  for (const c of BASE_COLLECTIONS) {
    const seen = new Set<string>();
    const out: Rec[] = [];
    let humanTouched = 0;
    for (const r of records[c] ?? []) {
      if (!r.import) continue;
      if (seedIds[c].has(r.id)) throw new ExportError(`${c}/${r.id}: trùng ID với dữ liệu mẫu (content/seed) — không thể xuất làm lớp nền.`);
      if (seen.has(r.id)) throw new ExportError(`${c}/${r.id}: ID bị trùng trong dữ liệu nhập.`);
      const parsed = COLLECTION_SCHEMAS[c].safeParse(r);
      if (!parsed.success) throw new ExportError(`${c}/${r.id}: không hợp lệ theo schema — ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
      if (r.status === "verified" || r.status === "published" || r.reviewed_by) humanTouched++;
      seen.add(r.id);
      out.push(r);
      manifest.counts[c]++;
      bump(manifest.by_level[c], r.level ?? "—");
      bump(manifest.by_status[c], r.status ?? "—");
      if (r.import.dataset_version) versions.add(r.import.dataset_version);
      if (r.import.run_id) runs.add(r.import.run_id);
      if (r.import.source_id) sources.add(r.import.source_id);
    }
    if (humanTouched > 0) manifest.warnings.push(`${c}: ${humanTouched} bản ghi đã có người rà soát/xác minh — xuất ra lớp nền sẽ "đóng băng" bản đó; hãy chắc đây là điều bạn muốn.`);
    data[c] = out;
  }
  manifest.dataset_versions = [...versions].sort();
  manifest.run_ids = [...runs].sort();
  manifest.source_ids = [...sources].sort();
  return { data, manifest };
}
