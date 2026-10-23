import { daysBetween } from "./dates";

export interface StreakInfo {
  /** Chuỗi hiện tại (số ngày đã học trong chuỗi). 0 nếu chuỗi đã đứt. */
  current: number;
  longest: number;
  /** Chuỗi còn "sống" (chưa đứt) tính đến hôm nay */
  alive: boolean;
  studiedToday: boolean;
  /** Hôm nay chưa học nhưng chuỗi vẫn giữ nhờ ngày nghỉ được phép */
  usingRestDay: boolean;
}

/**
 * Chuỗi ngày học có "ngày nghỉ được phép": hai ngày học liên tiếp trong chuỗi có thể cách nhau tối đa
 * (1 + restDays) ngày lịch, tức nghỉ 1 ngày giữa chừng không làm mất chuỗi. Nghỉ 2 ngày liên tiếp thì chuỗi đứt.
 * Số trong chuỗi đếm ngày ĐÃ HỌC (ngày nghỉ không cộng thêm). Không bao giờ xóa tiến độ học, chỉ chuỗi đếm đứt.
 */
export function computeStreak(studyDays: string[], today: string, restDays = 1): StreakInfo {
  const days = [...new Set(studyDays)].sort();
  if (days.length === 0) return { current: 0, longest: 0, alive: false, studiedToday: false, usingRestDay: false };
  const maxGap = 1 + restDays;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = daysBetween(days[i - 1], days[i]) <= maxGap ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const last = days[days.length - 1];
  const sinceLast = daysBetween(last, today);
  const studiedToday = last === today;
  const alive = sinceLast <= maxGap && sinceLast >= 0;
  return {
    current: alive ? run : 0,
    longest,
    alive,
    studiedToday,
    usingRestDay: alive && !studiedToday && sinceLast > 1,
  };
}
