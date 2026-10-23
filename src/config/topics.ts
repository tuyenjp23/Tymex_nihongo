/** Nhãn chủ đề từ vựng. Admin nhập chủ đề tự do (slug); chủ đề chưa có nhãn sẽ hiển thị đúng slug. */
export const VOCAB_TOPIC_LABELS: Record<string, string> = {
  nature: "Thiên nhiên",
  animals: "Động vật",
  body: "Cơ thể",
  food: "Đồ ăn thức uống",
  things: "Đồ vật",
  places: "Địa điểm",
  people: "Con người",
  time: "Thời gian",
  work: "Công việc & học tập",
  verbs: "Động từ",
  adjectives: "Tính từ",
  abstract: "Từ trừu tượng",
  life: "Đời sống",
};

export const topicLabel = (t: string) => VOCAB_TOPIC_LABELS[t] ?? t;
