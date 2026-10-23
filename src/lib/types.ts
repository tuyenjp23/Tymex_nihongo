export const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * Vòng đời nội dung. "imported" và "machine_translated" là hai trạng thái dành cho dữ liệu nhập từ nguồn ngoài:
 *  - imported: nhập từ bộ dữ liệu nguồn, chưa ai đọc lại.
 *  - machine_translated: có phần dịch máy (ví dụ AI dịch Anh → Việt), chưa ai kiểm tra bản dịch.
 * Không có đường tự động nào đưa bản ghi lên "verified"/"published" — chỉ người rà soát (người thật) mới đổi được.
 */
export const STATUSES = ["draft", "imported", "machine_translated", "ai_generated", "needs_review", "verified", "published"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  draft: "Bản nháp",
  imported: "Đã nhập – chưa kiểm tra",
  machine_translated: "Dịch máy – chưa kiểm tra",
  ai_generated: "AI soạn – chưa xác minh",
  needs_review: "Cần rà soát",
  verified: "Đã xác minh nội dung",
  published: "Đã xuất bản",
};

/** Nguồn gốc của nội dung — phân biệt rõ 3 loại theo yêu cầu sản phẩm. */
export const ORIGINS = ["official_sample", "self_authored", "ai_generated", "imported_dataset"] as const;
export type Origin = (typeof ORIGINS)[number];

export const ORIGIN_LABELS: Record<Origin, string> = {
  official_sample: "Mẫu chính thức (dùng đúng quyền)",
  self_authored: "Tự biên soạn",
  ai_generated: "AI tạo, chưa xác minh",
  imported_dataset: "Nhập từ bộ dữ liệu mở",
};

export const SKILLS = ["vocabulary", "kanji", "grammar", "reading", "listening"] as const;
export type Skill = (typeof SKILLS)[number];

export const COLLECTION_KEYS = [
  "sources",
  "images",
  "vocabulary",
  "kanji",
  "grammar",
  "sentences",
  "questions",
  "quiz_sets",
  "passages",
  "conversations",
  "lessons",
] as const;
export type CollectionKey = (typeof COLLECTION_KEYS)[number];

export const LESSON_MODULES = ["vocabulary", "kanji", "grammar", "reading", "listening", "conversation"] as const;
export type LessonModule = (typeof LESSON_MODULES)[number];

export const CONVERSATION_CATEGORIES = [
  "workplace",
  "boss-colleague",
  "report-contact",
  "request-apology",
  "meeting",
  "shopping",
  "restaurant",
  "hospital",
  "transport-life",
  "friends",
  "phone",
  "email",
  "keigo",
  "casual",
] as const;
export type ConversationCategory = (typeof CONVERSATION_CATEGORIES)[number];

export const CONVERSATION_CATEGORY_LABELS: Record<ConversationCategory, string> = {
  workplace: "Giao tiếp nơi làm việc",
  "boss-colleague": "Với cấp trên & đồng nghiệp",
  "report-contact": "Báo cáo, liên lạc, trao đổi công việc",
  "request-apology": "Xin phép, nhờ giúp, xin lỗi, cảm ơn",
  meeting: "Họp & tiến độ",
  shopping: "Cửa hàng & mua sắm",
  restaurant: "Nhà hàng",
  hospital: "Bệnh viện",
  "transport-life": "Giao thông & đời sống ở Nhật",
  friends: "Với bạn bè",
  phone: "Điện thoại",
  email: "Email công việc",
  keigo: "Kính ngữ & cách nói lịch sự",
  casual: "Thân mật & rút gọn",
};
