import { JLPT_OFFICIAL, JLPT_OFFICIAL_URLS, JLPT_OFFICIAL_VERIFIED_ON } from "@/config/jlpt";
import type { Level } from "@/lib/types";
import { formatDateVi } from "@/lib/dates";

/** Bảng cấu trúc bài thi CHÍNH THỨC (thời gian, phần chấm điểm, điểm đỗ) kèm nguồn và ngày đối chiếu. */
export function OfficialExam({ level }: { level: Level }) {
  const o = JLPT_OFFICIAL[level];
  const total = o.sections.reduce((s, x) => s + x.minutes, 0);
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="mb-1 font-semibold">Thời gian thi ({total} phút)</h3>
        <table className="w-full">
          <caption className="sr-only">Thời gian từng phần thi {level}</caption>
          <tbody className="divide-y divide-border">
            {o.sections.map((s) => (
              <tr key={s.id}>
                <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                  {s.name}
                  <span className="jp block text-xs text-muted-foreground">{s.nameJa}</span>
                </th>
                <td className="py-1.5 text-right tabular-nums">{s.minutes} phút</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="mb-1 font-semibold">Phần chấm điểm</h3>
        <table className="w-full">
          <caption className="sr-only">Phần chấm điểm {level}</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="py-1 font-normal">Phần</th>
              <th scope="col" className="py-1 text-right font-normal">Tối đa</th>
              <th scope="col" className="py-1 text-right font-normal">Điểm liệt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {o.scoring.map((s) => (
              <tr key={s.id}>
                <th scope="row" className="py-1.5 pr-3 text-left font-normal">{s.name}</th>
                <td className="py-1.5 text-right tabular-nums">{s.maxScore}</td>
                <td className="py-1.5 text-right tabular-nums">{s.sectionalPass}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2">Điểm đỗ tổng: <strong>{o.totalPass}/{o.totalMax}</strong> (và không phần nào dưới điểm liệt).</p>
      </div>
      <div className="space-y-1 text-muted-foreground">
        <p><strong className="text-foreground">Đọc hiểu:</strong> {o.summaryVi.reading}</p>
        <p><strong className="text-foreground">Nghe hiểu:</strong> {o.summaryVi.listening}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Đối chiếu ngày {formatDateVi(JLPT_OFFICIAL_VERIFIED_ON)} với{" "}
        <a className="text-primary underline" href={JLPT_OFFICIAL_URLS.sections} target="_blank" rel="noopener noreferrer">thời gian thi</a>,{" "}
        <a className="text-primary underline" href={JLPT_OFFICIAL_URLS.results} target="_blank" rel="noopener noreferrer">điểm số</a> và{" "}
        <a className="text-primary underline" href={JLPT_OFFICIAL_URLS.summary} target="_blank" rel="noopener noreferrer">mô tả năng lực</a> trên trang JLPT chính thức (phần mô tả là diễn giải tiếng Việt, không phải bản dịch chính thức). Thông tin có thể thay đổi — hãy kiểm tra lại trước khi đăng ký thi.
      </p>
    </div>
  );
}
