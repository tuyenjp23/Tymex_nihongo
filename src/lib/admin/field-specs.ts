import {
  CONVERSATION_CATEGORIES,
  CONVERSATION_CATEGORY_LABELS,
  LESSON_MODULES,
  LEVELS,
  ORIGINS,
  ORIGIN_LABELS,
  STATUSES,
  STATUS_LABELS,
  SKILLS,
  type CollectionKey,
} from "../types";
import {
  IMPORT_POLICIES,
  IMPORT_POLICY_LABELS,
  POLITENESS,
  POLITENESS_LABELS,
  QUIZ_SET_KINDS,
  QUIZ_SET_KIND_LABELS,
  SENTENCE_TRANSLATION_KINDS,
  SENTENCE_TRANSLATION_KIND_LABELS,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  VI_KINDS,
  VI_KIND_LABELS,
} from "../schemas";

/**
 * Mô tả các trường của từng loại nội dung để Admin tự dựng form và để import CSV biết cách đọc từng cột.
 * File này KHÔNG phải nguồn sự thật về tính hợp lệ — Zod schema trong schemas.ts mới là nguồn đó (kiểm tra lại ở server).
 * Thêm trường mới vào schema → thêm một dòng ở đây để nó xuất hiện trong form (nếu không thêm, trường vẫn được giữ nguyên khi sửa).
 */

export interface Option {
  value: string;
  label: string;
}

export type RefKind = "sources" | "images" | "passages" | "questions";

interface Base {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
}

export type FieldSpec =
  | (Base & { kind: "text" | "textarea" | "url" | "date"; nullable?: boolean; jp?: boolean; rows?: number; placeholder?: string })
  | (Base & { kind: "number"; min?: number; max?: number; int?: boolean })
  | (Base & { kind: "select"; options: Option[]; nullable?: boolean })
  | (Base & { kind: "boolean"; text: string })
  | (Base & { kind: "strings"; placeholder?: string; jp?: boolean })
  | (Base & { kind: "ref"; ref: RefKind; nullable?: boolean })
  | (Base & { kind: "list"; itemLabel: string; fields: FieldSpec[]; max?: number; min?: number; orderable?: boolean; blank: Record<string, unknown> })
  | (Base & { kind: "json"; rows?: number });

export interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  fields: FieldSpec[];
}

const opts = <T extends string>(values: readonly T[], labels?: Partial<Record<T, string>>): Option[] =>
  values.map((v) => ({ value: v, label: labels?.[v] ?? v }));

export const LEVEL_OPTIONS = opts(LEVELS);
export const STATUS_OPTIONS = opts(STATUSES, STATUS_LABELS);
export const ORIGIN_OPTIONS = opts(ORIGINS, ORIGIN_LABELS);
export const REUSE_OPTIONS: Option[] = [
  { value: "unknown", label: "Chưa rõ quyền dùng lại" },
  { value: "no", label: "Không được dùng lại" },
  { value: "personal_only", label: "Chỉ dùng cá nhân" },
  { value: "conditional", label: "Dùng lại có điều kiện" },
  { value: "own", label: "Của chính mình / tự biên soạn" },
];

export const VI_KIND_OPTIONS = opts(VI_KINDS, VI_KIND_LABELS);

const SKILL_VI: Record<(typeof SKILLS)[number], string> = {
  vocabulary: "Từ vựng",
  kanji: "Kanji",
  grammar: "Ngữ pháp",
  reading: "Đọc hiểu",
  listening: "Nghe",
};
const MODULE_VI: Record<(typeof LESSON_MODULES)[number], string> = {
  vocabulary: "Từ vựng",
  kanji: "Kanji",
  grammar: "Ngữ pháp",
  reading: "Đọc hiểu",
  listening: "Nghe",
  conversation: "Giao tiếp",
};

const exampleFields: FieldSpec[] = [
  { key: "ja", label: "Câu tiếng Nhật", kind: "textarea", jp: true, rows: 2, required: true, hint: "Chú âm: {漢字|かんじ}" },
  { key: "vi", label: "Nghĩa tiếng Việt", kind: "textarea", rows: 2, required: true },
];
const examples = (hint?: string): FieldSpec => ({
  key: "examples",
  label: "Ví dụ",
  kind: "list",
  itemLabel: "Ví dụ",
  fields: exampleFields,
  max: 12,
  blank: { ja: "", vi: "" },
  hint,
});
const tags: FieldSpec = { key: "tags", label: "Thẻ (tag)", kind: "strings", hint: "Mỗi dòng một thẻ", placeholder: "ví dụ: công sở" };

/* Nhóm "Nguồn gốc & xác minh" */
const provenanceFull: FieldGroup = {
  id: "provenance",
  title: "Nguồn gốc & xác minh",
  description: 'Trạng thái "Đã xác minh/Đã xuất bản" cần người rà soát là người thật và ngày xác minh. AI không được ghi là người xác minh.',
  fields: [
    { key: "origin", label: "Nguồn gốc nội dung", kind: "select", options: ORIGIN_OPTIONS, required: true },
    { key: "status", label: "Trạng thái", kind: "select", options: STATUS_OPTIONS, required: true },
    { key: "hidden", label: "Ẩn khỏi người học", kind: "boolean", text: "Ẩn (người học không thấy)" },
    { key: "source_id", label: "Nguồn trong sổ nguồn", kind: "ref", ref: "sources", nullable: true, hint: "Bắt buộc với \"Mẫu chính thức\"" },
    { key: "source_note", label: "Ghi chú nguồn", kind: "textarea", rows: 2 },
    { key: "reviewed_by", label: "Người rà soát", kind: "text", nullable: true, placeholder: "Tên người thật đã kiểm tra" },
    { key: "last_verified", label: "Ngày xác minh", kind: "date", nullable: true },
  ],
};

export const COLLECTION_GROUPS: Record<CollectionKey, FieldGroup[]> = {
  sources: [
    {
      id: "main",
      title: "Thông tin nguồn",
      fields: [
        { key: "source_name", label: "Tên nguồn", kind: "text", required: true },
        { key: "source_url", label: "URL", kind: "url", placeholder: "https://…", hint: "Để trống nếu không có" },
        { key: "source_type", label: "Loại nguồn", kind: "select", options: opts(SOURCE_TYPES, SOURCE_TYPE_LABELS), required: true },
        { key: "publisher", label: "Đơn vị phát hành", kind: "text" },
        { key: "purpose", label: "Dùng để làm gì trong app", kind: "textarea", rows: 2 },
        { key: "level_scope", label: "Phạm vi cấp độ", kind: "text" },
        { key: "license_note", label: "Giấy phép / điều khoản sử dụng", kind: "textarea", rows: 3, required: true, hint: "Ghi đúng những gì nguồn cho phép. Không chắc → ghi \"chưa rõ\" và chọn quyền dùng là \"Chưa rõ\"." },
        { key: "reuse_allowed", label: "Quyền dùng lại nội dung", kind: "select", options: REUSE_OPTIONS, required: true },
        { key: "notes", label: "Ghi chú", kind: "textarea", rows: 2 },
      ],
    },
    {
      id: "license",
      title: "Giấy phép, phiên bản & nhập dữ liệu",
      description: "Pipeline nhập dữ liệu chỉ chạy với nguồn có chính sách \"Được phép nhập\". Lịch sử cập nhật do pipeline tự ghi (không sửa ở đây).",
      fields: [
        { key: "license_name", label: "Tên giấy phép", kind: "text", placeholder: "ví dụ: CC BY-SA 4.0" },
        { key: "license_url", label: "URL giấy phép", kind: "url" },
        { key: "version", label: "Phiên bản dữ liệu đã dùng", kind: "text" },
        { key: "retrieved_at", label: "Ngày tải dữ liệu", kind: "date", nullable: true },
        { key: "allowed_use", label: "Nội dung được phép dùng", kind: "textarea", rows: 2 },
        { key: "attribution_required", label: "Yêu cầu ghi công", kind: "boolean", text: "Nguồn yêu cầu ghi công" },
        { key: "attribution_text", label: "Câu ghi công", kind: "textarea", rows: 3, hint: "Hiển thị ở trang Nguồn học liệu" },
        { key: "import_policy", label: "Chính sách nhập tự động", kind: "select", options: opts(IMPORT_POLICIES, IMPORT_POLICY_LABELS), required: true },
      ],
    },
    {
      id: "provenance",
      title: "Xác minh",
      description: "Chỉ đặt \"Đã xác minh\" sau khi một người thật đã mở nguồn và đối chiếu.",
      fields: [
        { key: "verification_status", label: "Trạng thái xác minh", kind: "select", options: STATUS_OPTIONS, required: true },
        { key: "reviewed_by", label: "Người rà soát", kind: "text", nullable: true },
        { key: "last_verified", label: "Ngày xác minh", kind: "date", nullable: true },
      ],
    },
  ],

  images: [
    {
      id: "main",
      title: "Hình minh họa",
      description: "Hình chỉ nên minh họa từ/khái niệm cụ thể. Từ trừu tượng không gán một hình duy nhất.",
      fields: [
        { key: "path", label: "Đường dẫn ảnh", kind: "url", required: true, hint: "Dùng nút tải ảnh lên bên dưới (PNG/JPG/WebP/GIF, ≤ 2 MB) hoặc dán URL" },
        { key: "alt_vi", label: "Mô tả thay thế (alt)", kind: "text", required: true },
        { key: "description", label: "Mô tả chi tiết", kind: "textarea", rows: 2 },
        { key: "kind", label: "Loại", kind: "select", options: [{ value: "illustration", label: "Minh họa" }, { value: "icon", label: "Biểu tượng" }, { value: "scene", label: "Cảnh" }], required: true },
        { key: "concepts", label: "Từ/khái niệm minh họa phù hợp", kind: "strings", hint: "Mỗi dòng một từ" },
        { key: "source_name", label: "Tên nguồn ảnh", kind: "text", required: true, hint: "Tự vẽ → ghi \"Tự vẽ\"" },
        { key: "source_url", label: "URL nguồn ảnh", kind: "url" },
        { key: "license_note", label: "Giấy phép ảnh", kind: "textarea", rows: 2, required: true },
        { key: "attribution", label: "Ghi công tác giả", kind: "text" },
      ],
    },
    {
      id: "provenance",
      title: "Trạng thái & xác minh",
      fields: [
        { key: "status", label: "Trạng thái", kind: "select", options: STATUS_OPTIONS, required: true },
        { key: "hidden", label: "Ẩn", kind: "boolean", text: "Ẩn (không dùng trong app)" },
        { key: "reviewed_by", label: "Người rà soát", kind: "text", nullable: true },
        { key: "last_verified", label: "Ngày xác minh", kind: "date", nullable: true },
      ],
    },
  ],

  vocabulary: [
    {
      id: "main",
      title: "Từ vựng",
      fields: [
        { key: "level", label: "Cấp gợi ý", kind: "select", options: LEVEL_OPTIONS, required: true, hint: "Chỉ là cấp gợi ý, không phải danh sách chính thức của JLPT" },
        { key: "word", label: "Từ", kind: "text", jp: true, required: true },
        { key: "reading", label: "Cách đọc (kana)", kind: "text", jp: true, required: true },
        { key: "meaning_vi", label: "Nghĩa tiếng Việt", kind: "textarea", rows: 2, hint: "Có thể để trống nếu chưa có — khi đó chọn loại bản dịch \"Chưa có tiếng Việt\"" },
        { key: "vi_kind", label: "Loại phần tiếng Việt", kind: "select", options: VI_KIND_OPTIONS, required: true },
        { key: "pos", label: "Từ loại", kind: "text" },
        { key: "topic", label: "Chủ đề", kind: "text", required: true },
        examples(),
        { key: "imageable", label: "Hình hóa được", kind: "boolean", text: "Từ cụ thể, hình hóa được (từ trừu tượng để tắt)" },
        { key: "image_id", label: "Hình minh họa", kind: "ref", ref: "images", nullable: true },
        { key: "audio_url", label: "URL âm thanh", kind: "url", nullable: true },
        tags,
        { key: "note", label: "Ghi chú", kind: "textarea", rows: 2 },
      ],
    },
    {
      id: "source-data",
      title: "Dữ liệu nguồn (nhiều nghĩa, nhiều cách viết/đọc)",
      description: "Các trường này thường do pipeline nhập dữ liệu điền. Sửa tay ở đây sẽ được pipeline tôn trọng (không bị ghi đè khi cập nhật nguồn).",
      fields: [
        { key: "alt_forms", label: "Cách viết khác", kind: "strings", jp: true, hint: "Mỗi dòng một cách viết" },
        { key: "alt_readings", label: "Cách đọc khác", kind: "strings", jp: true, hint: "Mỗi dòng một cách đọc" },
        { key: "senses", label: "Các nghĩa gốc (JSON)", kind: "json", rows: 10, hint: "Mảng các nghĩa: [{\"pos\":[\"n\"],\"glosses\":[{\"lang\":\"eng\",\"text\":\"...\"}]}]" },
        { key: "level_source", label: "Nguồn của cấp độ", kind: "ref", ref: "sources", nullable: true, hint: "Để trống nếu cấp độ do bạn tự đặt" },
      ],
    },
    provenanceFull,
  ],

  kanji: [
    {
      id: "main",
      title: "Kanji",
      fields: [
        { key: "level", label: "Cấp gợi ý", kind: "select", options: LEVEL_OPTIONS, required: true },
        { key: "char", label: "Chữ Kanji", kind: "text", jp: true, required: true },
        { key: "han_viet", label: "Âm Hán Việt", kind: "text" },
        { key: "meaning_vi", label: "Nghĩa tiếng Việt", kind: "textarea", rows: 2, hint: "Có thể để trống nếu chưa có — khi đó chọn loại bản dịch \"Chưa có tiếng Việt\"" },
        { key: "vi_kind", label: "Loại phần tiếng Việt", kind: "select", options: VI_KIND_OPTIONS, required: true },
        { key: "meanings_en", label: "Nghĩa gốc (tiếng Anh)", kind: "strings", hint: "Mỗi dòng một nghĩa" },
        { key: "onyomi", label: "Âm On", kind: "strings", jp: true, hint: "Mỗi dòng một âm (katakana)" },
        { key: "kunyomi", label: "Âm Kun", kind: "strings", jp: true, hint: "Mỗi dòng một âm (hiragana)" },
        { key: "reading_note", label: "Ghi chú cách đọc", kind: "textarea", rows: 2 },
        {
          key: "compounds",
          label: "Từ ghép",
          kind: "list",
          itemLabel: "Từ ghép",
          max: 20,
          blank: { word: "", reading: "", meaning_vi: "" },
          fields: [
            { key: "word", label: "Từ", kind: "text", jp: true, required: true },
            { key: "reading", label: "Cách đọc", kind: "text", jp: true, required: true },
            { key: "meaning_vi", label: "Nghĩa", kind: "text", required: true },
          ],
        },
        examples(),
        { key: "image_id", label: "Hình minh họa", kind: "ref", ref: "images", nullable: true },
        { key: "radical", label: "Bộ thủ", kind: "text", nullable: true, hint: "Chỉ điền khi đã đối chiếu nguồn tin cậy" },
        { key: "level_source", label: "Nguồn của cấp độ", kind: "ref", ref: "sources", nullable: true, hint: "Để trống nếu cấp độ do bạn tự đặt" },
        tags,
      ],
    },
    provenanceFull,
  ],

  grammar: [
    {
      id: "main",
      title: "Ngữ pháp",
      fields: [
        { key: "level", label: "Cấp gợi ý", kind: "select", options: LEVEL_OPTIONS, required: true },
        { key: "title", label: "Tên mẫu câu", kind: "text", jp: true, required: true },
        { key: "structure", label: "Cấu trúc", kind: "text", jp: true, required: true },
        { key: "meaning_vi", label: "Ý nghĩa", kind: "textarea", rows: 2, required: true },
        { key: "formation", label: "Cách chia/ghép", kind: "textarea", rows: 3 },
        { key: "usage", label: "Cách dùng", kind: "textarea", rows: 3 },
        { ...examples("Cần ít nhất 1 ví dụ"), min: 1 } as FieldSpec,
        {
          key: "comparisons",
          label: "So sánh với mẫu tương tự",
          kind: "list",
          itemLabel: "So sánh",
          max: 10,
          blank: { target: "", note_vi: "" },
          fields: [
            { key: "target", label: "Mẫu so sánh", kind: "text", jp: true, required: true },
            { key: "note_vi", label: "Khác nhau thế nào", kind: "textarea", rows: 2, required: true },
          ],
        },
        { key: "common_mistakes", label: "Lỗi thường gặp", kind: "strings", hint: "Mỗi dòng một lỗi" },
        tags,
      ],
    },
    provenanceFull,
  ],

  sentences: [
    {
      id: "main",
      title: "Câu ví dụ",
      fields: [
        { key: "ja", label: "Câu tiếng Nhật", kind: "textarea", jp: true, rows: 2, required: true },
        {
          key: "translations",
          label: "Bản dịch",
          kind: "list",
          itemLabel: "Bản dịch",
          min: 1,
          max: 6,
          blank: { lang: "vi", text: "", kind: "authored" },
          fields: [
            { key: "lang", label: "Mã ngôn ngữ", kind: "text", required: true, hint: "vi, en, ..." },
            { key: "text", label: "Bản dịch", kind: "textarea", rows: 2, required: true },
            { key: "kind", label: "Loại bản dịch", kind: "select", options: opts(SENTENCE_TRANSLATION_KINDS, SENTENCE_TRANSLATION_KIND_LABELS), required: true },
          ],
        },
        { key: "word_refs", label: "ID từ vựng có trong câu", kind: "strings", hint: "Mỗi dòng một ID từ vựng (chỉ khi xác định được)" },
        { key: "level", label: "Cấp độ (chỉ khi có căn cứ)", kind: "select", options: LEVEL_OPTIONS, nullable: true },
        { key: "level_source", label: "Nguồn của cấp độ", kind: "ref", ref: "sources", nullable: true },
        { key: "attribution", label: "Ghi công", kind: "textarea", rows: 2 },
        { key: "source_url", label: "URL gốc của câu", kind: "url" },
        { key: "license", label: "Giấy phép của câu", kind: "text" },
        tags,
      ],
    },
    provenanceFull,
  ],

  questions: [
    {
      id: "main",
      title: "Câu hỏi",
      description: "Câu do AI/tự soạn không bao giờ được gắn nhãn \"đề chính thức\". Chỉ nội dung có nguồn chính thức mới chọn \"Mẫu chính thức\".",
      fields: [
        { key: "level", label: "Cấp gợi ý", kind: "select", options: LEVEL_OPTIONS, required: true },
        { key: "skill", label: "Kỹ năng", kind: "select", options: opts(SKILLS, SKILL_VI), required: true },
        { key: "topic", label: "Chủ đề", kind: "text", required: true },
        { key: "stem", label: "Câu hỏi", kind: "textarea", jp: true, rows: 3, required: true },
        {
          key: "options",
          label: "Các phương án",
          kind: "list",
          itemLabel: "Phương án",
          min: 2,
          max: 6,
          orderable: true,
          blank: { id: "", text: "", explanation_vi: "" },
          hint: "ID phương án ngắn và duy nhất (a, b, c, d…)",
          fields: [
            { key: "id", label: "ID", kind: "text", required: true },
            { key: "text", label: "Nội dung", kind: "text", jp: true, required: true },
            { key: "explanation_vi", label: "Giải thích phương án (nếu có căn cứ)", kind: "textarea", rows: 2 },
          ],
        },
        { key: "correct_option_id", label: "ID đáp án đúng", kind: "text", required: true },
        { key: "explanation_vi", label: "Giải thích", kind: "textarea", rows: 3, required: true },
        { key: "difficulty", label: "Độ khó (1–3)", kind: "number", min: 1, max: 3, int: true, required: true },
        { key: "passage_id", label: "Bài đọc/nghe liên kết", kind: "ref", ref: "passages", nullable: true, hint: "Bắt buộc với câu hỏi Nghe" },
        {
          key: "ref_type",
          label: "Liên kết tới mục học",
          kind: "select",
          nullable: true,
          options: [
            { value: "vocabulary", label: "Từ vựng" },
            { value: "kanji", label: "Kanji" },
            { value: "grammar", label: "Ngữ pháp" },
          ],
        },
        { key: "ref_id", label: "ID mục học liên kết", kind: "text", nullable: true },
        tags,
      ],
    },
    provenanceFull,
  ],

  passages: [
    {
      id: "main",
      title: "Bài đọc / nghe",
      fields: [
        { key: "level", label: "Cấp gợi ý", kind: "select", options: LEVEL_OPTIONS, required: true },
        { key: "kind", label: "Loại", kind: "select", options: [{ value: "reading", label: "Đọc hiểu" }, { value: "listening", label: "Nghe" }], required: true },
        { key: "title", label: "Tiêu đề", kind: "text", required: true },
        { key: "body", label: "Nội dung (bài đọc)", kind: "textarea", jp: true, rows: 8, hint: "Bài nghe để trống. Chú âm: {漢字|かんじ}" },
        { key: "body_vi", label: "Bản dịch tiếng Việt", kind: "textarea", rows: 6 },
        {
          key: "script",
          label: "Kịch bản (bài nghe)",
          kind: "list",
          itemLabel: "Lượt nói",
          max: 40,
          orderable: true,
          blank: { speaker: "", text: "", vi: "" },
          fields: [
            { key: "speaker", label: "Người nói", kind: "text", required: true },
            { key: "text", label: "Lời thoại", kind: "textarea", jp: true, rows: 2, required: true },
            { key: "vi", label: "Dịch", kind: "textarea", rows: 2, required: true },
          ],
        },
        tags,
      ],
    },
    provenanceFull,
  ],

  conversations: [
    {
      id: "main",
      title: "Hội thoại",
      fields: [
        { key: "category", label: "Chủ đề", kind: "select", options: opts(CONVERSATION_CATEGORIES, CONVERSATION_CATEGORY_LABELS), required: true },
        { key: "level_hint", label: "Cấp gợi ý (độ khó ngôn ngữ)", kind: "select", options: LEVEL_OPTIONS, required: true, hint: "Không phải cấp đạt chuẩn JLPT" },
        { key: "title", label: "Tiêu đề", kind: "text", required: true },
        { key: "context", label: "Bối cảnh", kind: "textarea", rows: 2, required: true },
        { key: "goal", label: "Mục tiêu giao tiếp", kind: "textarea", rows: 2, required: true },
        {
          key: "characters",
          label: "Nhân vật",
          kind: "list",
          itemLabel: "Nhân vật",
          min: 1,
          max: 6,
          blank: { name: "", role: "" },
          fields: [
            { key: "name", label: "Tên", kind: "text", required: true },
            { key: "role", label: "Vai", kind: "text", required: true },
          ],
        },
        { key: "politeness", label: "Mức lịch sự", kind: "select", options: opts(POLITENESS, POLITENESS_LABELS), required: true },
        {
          key: "lines",
          label: "Lời thoại",
          kind: "list",
          itemLabel: "Lượt nói",
          min: 2,
          max: 60,
          orderable: true,
          blank: { speaker: "", ja: "", vi: "" },
          fields: [
            { key: "speaker", label: "Người nói", kind: "text", required: true },
            { key: "ja", label: "Tiếng Nhật", kind: "textarea", jp: true, rows: 2, required: true },
            { key: "vi", label: "Tiếng Việt", kind: "textarea", rows: 2, required: true },
          ],
        },
        {
          key: "vocab_notes",
          label: "Từ vựng đáng chú ý",
          kind: "list",
          itemLabel: "Từ",
          max: 30,
          blank: { term: "", reading: "", meaning_vi: "" },
          fields: [
            { key: "term", label: "Từ", kind: "text", jp: true, required: true },
            { key: "reading", label: "Cách đọc", kind: "text", jp: true },
            { key: "meaning_vi", label: "Nghĩa", kind: "text", required: true },
          ],
        },
        {
          key: "grammar_notes",
          label: "Ngữ pháp đáng chú ý",
          kind: "list",
          itemLabel: "Mẫu câu",
          max: 20,
          blank: { pattern: "", note_vi: "" },
          fields: [
            { key: "pattern", label: "Mẫu câu", kind: "text", jp: true, required: true },
            { key: "note_vi", label: "Giải thích", kind: "textarea", rows: 2, required: true },
          ],
        },
        {
          key: "alternatives",
          label: "Cách nói khác",
          kind: "list",
          itemLabel: "Cách nói",
          max: 12,
          blank: { ja: "", vi: "", nuance_vi: "" },
          fields: [
            { key: "ja", label: "Tiếng Nhật", kind: "text", jp: true, required: true },
            { key: "vi", label: "Tiếng Việt", kind: "text", required: true },
            { key: "nuance_vi", label: "Sắc thái", kind: "textarea", rows: 2 },
          ],
        },
        {
          key: "other_situations",
          label: "Tình huống khác dùng được",
          kind: "list",
          itemLabel: "Tình huống",
          max: 12,
          blank: { situation_vi: "", ja: "", vi: "" },
          fields: [
            { key: "situation_vi", label: "Tình huống", kind: "text", required: true },
            { key: "ja", label: "Tiếng Nhật", kind: "text", jp: true, required: true },
            { key: "vi", label: "Tiếng Việt", kind: "text", required: true },
          ],
        },
        {
          key: "drills",
          label: "Luyện phản xạ",
          kind: "list",
          itemLabel: "Bài luyện",
          max: 12,
          blank: { prompt_vi: "", model_ja: "", hint_vi: "" },
          fields: [
            { key: "prompt_vi", label: "Đề bằng tiếng Việt", kind: "text", required: true },
            { key: "model_ja", label: "Câu mẫu tiếng Nhật", kind: "text", jp: true, required: true },
            { key: "hint_vi", label: "Gợi ý", kind: "text" },
          ],
        },
        {
          key: "roleplay",
          label: "Nhập vai (JSON)",
          kind: "json",
          rows: 14,
          hint: "Mảng các lượt: {id, npc_ja, npc_vi, options:[{ja, vi, fit:\"best|ok|poor\", feedback_vi, next}]}. Trường `next` phải là id của một lượt khác hoặc null.",
        },
        {
          key: "references",
          label: "Tài liệu tham khảo",
          kind: "list",
          itemLabel: "Tham khảo",
          max: 10,
          blank: { title: "", url: "" },
          fields: [
            { key: "title", label: "Tiêu đề", kind: "text", required: true },
            { key: "url", label: "URL", kind: "url" },
          ],
        },
        tags,
      ],
    },
    provenanceFull,
  ],

  quiz_sets: [
    {
      id: "main",
      title: "Bộ đề",
      description: "Ghép các câu hỏi có sẵn thành một bộ đề cho người học. Câu bị ẩn/nháp sẽ tự bị bỏ qua khi người học làm bài.",
      fields: [
        { key: "title", label: "Tên bộ đề", kind: "text", required: true },
        { key: "description", label: "Mô tả", kind: "textarea", rows: 2 },
        { key: "level", label: "Cấp độ gợi ý", kind: "select", options: LEVEL_OPTIONS, required: true, hint: "Bộ đề hiện ở trang JLPT của cấp này." },
        { key: "kind", label: "Hình thức", kind: "select", options: opts(QUIZ_SET_KINDS, QUIZ_SET_KIND_LABELS), required: true },
        { key: "shuffle", label: "Thứ tự câu", kind: "boolean", text: "Xáo thứ tự câu mỗi lần làm" },
        { key: "order", label: "Thứ tự hiển thị", kind: "number", min: 0, max: 10000, int: true, required: true },
        {
          key: "items",
          label: "Câu hỏi trong bộ đề",
          kind: "list",
          itemLabel: "Câu hỏi",
          min: 3,
          max: 100,
          orderable: true,
          blank: { question_id: "" },
          fields: [{ key: "question_id", label: "Câu hỏi", kind: "ref", ref: "questions", required: true }],
        },
        tags,
      ],
    },
    provenanceFull,
  ],

  lessons: [
    {
      id: "main",
      title: "Bài học",
      fields: [
        { key: "level", label: "Cấp gợi ý", kind: "select", options: LEVEL_OPTIONS, required: true },
        { key: "module", label: "Mô-đun", kind: "select", options: opts(LESSON_MODULES, MODULE_VI), required: true },
        { key: "title", label: "Tiêu đề", kind: "text", required: true },
        { key: "summary", label: "Tóm tắt", kind: "textarea", rows: 2 },
        { key: "order", label: "Thứ tự", kind: "number", min: 0, max: 10000, int: true, required: true },
        { key: "est_minutes", label: "Thời lượng (phút)", kind: "number", min: 1, max: 240, int: true, required: true },
        { key: "body", label: "Nội dung", kind: "textarea", jp: true, rows: 12, hint: "Ngăn đoạn bằng dòng trống; **đậm**; chú âm {漢字|かんじ}" },
        {
          key: "item_refs",
          label: "Mục học gắn kèm",
          kind: "list",
          itemLabel: "Mục",
          max: 100,
          orderable: true,
          blank: { type: "vocabulary", id: "" },
          fields: [
            {
              key: "type",
              label: "Loại",
              kind: "select",
              required: true,
              options: [
                { value: "vocabulary", label: "Từ vựng" },
                { value: "kanji", label: "Kanji" },
                { value: "grammar", label: "Ngữ pháp" },
                { value: "conversation", label: "Hội thoại" },
                { value: "passage", label: "Bài đọc/nghe" },
              ],
            },
            { key: "id", label: "ID mục", kind: "text", required: true },
          ],
        },
        tags,
      ],
    },
    provenanceFull,
  ],
};

export function allSpecs(collection: CollectionKey): FieldSpec[] {
  return COLLECTION_GROUPS[collection].flatMap((g) => g.fields);
}

/** Tiền tố ID gợi ý khi tạo mới. */
export const ID_PREFIX: Record<CollectionKey, string> = {
  sources: "src",
  images: "img",
  vocabulary: "vocab",
  kanji: "kanji",
  grammar: "gram",
  sentences: "sent",
  questions: "q",
  quiz_sets: "qset",
  passages: "psg",
  conversations: "conv",
  lessons: "lesson",
};

function defaultFor(spec: FieldSpec): unknown {
  switch (spec.kind) {
    case "text":
    case "textarea":
    case "url":
    case "date":
      return spec.nullable ? null : "";
    case "number":
      return spec.min ?? 0;
    case "select":
      return spec.nullable ? null : (spec.options[0]?.value ?? "");
    case "boolean":
      return false;
    case "strings":
      return [];
    case "ref":
      return null;
    case "list": {
      const n = spec.min ?? 0;
      return Array.from({ length: n }, () => ({ ...spec.blank }));
    }
    case "json":
      return [];
  }
}

/** Bản ghi trống để tạo mới (nội dung do người dùng tạo mặc định là "tự biên soạn – bản nháp"). */
export function blankRecord(collection: CollectionKey, id: string): Record<string, unknown> {
  const rec: Record<string, unknown> = { id };
  for (const s of allSpecs(collection)) rec[s.key] = defaultFor(s);
  if ("origin" in rec) rec.origin = "self_authored";
  if ("status" in rec) rec.status = "draft";
  if ("verification_status" in rec) rec.verification_status = "draft";
  if (collection === "sources") {
    rec.reuse_allowed = "unknown";
    rec.source_type = "other";
    rec.import_policy = "not_applicable";
  }
  if (collection === "vocabulary" || collection === "kanji") rec.vi_kind = "authored";
  if (collection === "sentences") rec.level = null;
  if (collection === "lessons") {
    rec.est_minutes = 10;
  }
  if (collection === "quiz_sets") {
    rec.kind = "practice";
    rec.shuffle = true;
    rec.order = 0;
    rec.level = "N5";
  }
  if (collection === "questions") {
    rec.difficulty = 1;
    rec.skill = "vocabulary";
    rec.options = [
      { id: "a", text: "", explanation_vi: "" },
      { id: "b", text: "", explanation_vi: "" },
      { id: "c", text: "", explanation_vi: "" },
      { id: "d", text: "", explanation_vi: "" },
    ];
    rec.correct_option_id = "a";
  }
  return rec;
}

/* ───────────── Chuẩn hóa dữ liệu trước khi kiểm tra ───────────── */

function normalizeValue(spec: FieldSpec, v: unknown): unknown {
  switch (spec.kind) {
    case "text":
    case "textarea":
    case "url":
    case "date": {
      if (v === undefined || v === null) return spec.nullable ? null : "";
      if (typeof v !== "string") return v;
      const t = spec.kind === "textarea" ? v.replace(/\r\n/g, "\n") : v;
      const trimmed = t.trim();
      if (spec.nullable && trimmed === "") return null;
      return spec.kind === "textarea" ? t.replace(/^\s+|\s+$/g, "") : trimmed;
    }
    case "select":
      return spec.nullable && (v === "" || v === undefined) ? null : v;
    case "ref":
      return v === "" || v === undefined ? null : v;
    case "number":
      if (typeof v === "string") {
        const t = v.trim();
        return t === "" ? undefined : Number(t);
      }
      return v;
    case "strings":
      return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : x)).filter((x) => x !== "") : v;
    case "list":
      return Array.isArray(v)
        ? v.map((item) =>
            item && typeof item === "object"
              ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([k, val]) => {
                  const sub = spec.fields.find((f) => f.key === k);
                  return [k, sub ? normalizeValue(sub, val) : val];
                }))
              : item,
          )
        : v;
    default:
      return v;
  }
}

/** Cắt khoảng trắng, đổi chuỗi rỗng → null cho trường cho phép null, dọn mảng chuỗi. */
export function normalizeRecord(collection: CollectionKey, input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  if (typeof out.id === "string") out.id = out.id.trim();
  for (const s of allSpecs(collection)) if (s.key in out || s.kind === "number") out[s.key] = normalizeValue(s, out[s.key]);
  return out;
}

/* ───────────── Đọc ô CSV ───────────── */

/** Đổi một ô CSV (chuỗi) sang kiểu đúng của trường. Mảng/đối tượng phải ghi dạng JSON trong ô. */
export function coerceCsvCell(spec: FieldSpec, raw: string): unknown {
  const t = raw.trim();
  switch (spec.kind) {
    case "boolean":
      return ["true", "1", "yes", "có", "x"].includes(t.toLowerCase());
    case "number":
      return t === "" ? undefined : Number(t);
    case "strings":
      if (t === "") return [];
      if (t.startsWith("[")) return JSON.parse(t);
      return t.split(/\r?\n|\|/).map((s) => s.trim()).filter(Boolean);
    case "list":
    case "json":
      return t === "" ? [] : JSON.parse(t);
    case "ref":
      return t === "" ? null : t;
    case "select":
      return t === "" ? (spec.nullable ? null : undefined) : t;
    case "text":
    case "textarea":
    case "url":
    case "date":
      return spec.nullable && t === "" ? null : raw;
  }
}

/** Các cột dùng khi xuất CSV: id, các trường theo form, thời gian tạo/sửa. */
export function csvColumns(collection: CollectionKey): string[] {
  return ["id", ...allSpecs(collection).map((s) => s.key), "created_at", "updated_at"];
}
