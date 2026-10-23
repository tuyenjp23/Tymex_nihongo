export interface DashboardSectionDef {
  id: string;
  label: string;
  description: string;
}

/** Danh sách section có thể có trên Dashboard (admin bật/tắt & sắp xếp tại /admin/appearance). */
export const dashboardSectionDefs: DashboardSectionDef[] = [
  { id: "goals", label: "Mục tiêu hôm nay", description: "Phút học và XP so với mục tiêu ngày" },
  { id: "streak", label: "Chuỗi ngày học", description: "Số ngày học liên tiếp (cho phép nghỉ 1 ngày)" },
  { id: "next-lesson", label: "Gợi ý bài tiếp theo", description: "Dựa trên tiến độ thực tế của bạn" },
  { id: "review-due", label: "Từ cần ôn", description: "Số mục đến hạn ôn theo lịch lặp lại ngắt quãng" },
  { id: "jlpt-progress", label: "Tiến độ JLPT", description: "Tỉ lệ nội dung đã học theo từng cấp" },
  { id: "vocab-stats", label: "Từ vựng đã học", description: "Số từ đang học / đã thuộc" },
  { id: "last-score", label: "Điểm bài kiểm tra gần nhất", description: "Kết quả bài luyện/thi thử cuối cùng" },
  { id: "continue", label: "Bài đang dang dở", description: "Các bài học đã bắt đầu nhưng chưa xong" },
  { id: "quick-games", label: "Truy cập nhanh trò chơi", description: "Mở nhanh các chế độ Kanji Quest" },
];

export const defaultDashboardSections = dashboardSectionDefs.map((s) => ({ id: s.id, enabled: true }));
