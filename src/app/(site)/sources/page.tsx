import { ensureModule, getVisible } from "@/lib/content";
import { PageHeader, Card, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/states";
import { IMPORT_POLICY_LABELS, SOURCE_TYPE_LABELS } from "@/lib/schemas";
import { STATUSES, STATUS_LABELS } from "@/lib/types";
import { formatDateVi } from "@/lib/dates";

export const metadata = { title: "Nguồn học liệu" };

const REUSE_LABELS = {
  no: "Không được sao chép",
  personal_only: "Chỉ dùng cá nhân",
  conditional: "Có điều kiện — chỉ liên kết/trích dẫn",
  unknown: "Chưa rõ",
  own: "Tự biên soạn",
} as const;

export default async function SourcesPage() {
  await ensureModule("sources");
  const [sources, images, vocab, kanji, sentences] = await Promise.all([getVisible("sources"), getVisible("images"), getVisible("vocabulary"), getVisible("kanji"), getVisible("sentences")]);
  // Số mục người học đang thấy theo từng nguồn (nội dung + căn cứ cấp độ)
  const usage = new Map<string, number>();
  for (const r of [...vocab, ...kanji, ...sentences] as { source_id?: string | null; level_source?: string | null }[]) {
    if (r.source_id) usage.set(r.source_id, (usage.get(r.source_id) ?? 0) + 1);
    if (r.level_source) usage.set(r.level_source, (usage.get(r.level_source) ?? 0) + 1);
  }
  const attribution = sources.filter((s) => s.attribution_required && s.attribution_text && (usage.get(s.id) ?? 0) > 0);
  return (
    <>
      <PageHeader
        title="Nguồn học liệu"
        description="Minh bạch về nguồn gốc: mỗi từ, Kanji, câu hỏi, hội thoại đều trỏ về một nguồn và có trạng thái xác minh."
      />
      <Alert tone="info" title="Cách app xử lý bản quyền" className="mb-[var(--gap)]">
        Với tài liệu chính thức (JLPT, Japan Foundation…) app chỉ <strong>liên kết và tham chiếu số liệu công khai</strong>, không sao chép đề thi hay bài đọc có bản quyền.
        Nội dung trong app do AI soạn mới và được gắn nhãn rõ; không nội dung nào được gắn là “đề thi chính thức”.
      </Alert>

      {attribution.length > 0 ? (
        <Card className="mb-[var(--gap)]" id="ghi-cong">
          <CardTitle>Ghi công dữ liệu</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Một phần từ vựng, Kanji và câu ví dụ trong app lấy từ các dự án dữ liệu mở dưới đây, dùng theo đúng giấy phép của họ. Cấp độ N5–N1 của dữ liệu nhập là phân loại của cộng đồng, <strong>không phải danh sách chính thức của JLPT</strong>.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {attribution.map((s) => (
              <li key={s.id}>
                <p>{s.attribution_text}</p>
                <p className="text-xs text-muted-foreground">
                  Giấy phép: {s.license_url ? <a className="text-primary underline" href={s.license_url} target="_blank" rel="noopener noreferrer">{s.license_name || s.license_url}</a> : s.license_name} · {usage.get(s.id)} mục trong app{s.version ? ` · phiên bản ${s.version}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mb-[var(--gap)]">
        <CardTitle>Các trạng thái xác minh</CardTitle>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {STATUSES.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <StatusBadge status={s} />
              <span className="text-muted-foreground">
                {{ draft: "Bản nháp, người học không thấy.", imported: "Nhập từ bộ dữ liệu mở, chưa ai đọc lại.", machine_translated: "Có phần dịch máy (ví dụ Anh → Việt), chưa ai kiểm tra.", ai_generated: "Do AI soạn, chưa có người rà soát.", needs_review: "Đang chờ giáo viên/người bản ngữ kiểm tra.", verified: "Đã được người có chuyên môn kiểm tra và đối chiếu nguồn.", published: "Đã xác minh và được công bố chính thức." }[s]}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Mục “{STATUS_LABELS.verified}” và “{STATUS_LABELS.published}” chỉ được đặt khi có tên người rà soát và ngày xác minh.</p>
      </Card>

      <h2 className="mb-2 text-lg font-semibold">Danh sách nguồn ({sources.length})</h2>
      <ul className="space-y-[var(--gap)]">
        {sources.map((s) => (
          <li key={s.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold">{s.source_name}</h3>
                  <p className="text-sm text-muted-foreground">{s.publisher}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={s.verification_status} />
                  <Badge>{SOURCE_TYPE_LABELS[s.source_type]}</Badge>
                  {s.import_policy === "allowed" ? <Badge tone="success">{IMPORT_POLICY_LABELS.allowed}</Badge> : null}
                  {s.import_policy === "blocked" ? <Badge tone="danger">Chỉ liên kết — không sao chép</Badge> : null}
                </div>
              </div>
              <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[10rem_1fr]">
                {s.source_url ? (<><dt className="text-muted-foreground">Liên kết</dt><dd><a className="break-all text-primary underline" href={s.source_url} target="_blank" rel="noopener noreferrer">{s.source_url}</a></dd></>) : null}
                <dt className="text-muted-foreground">Mục đích</dt><dd>{s.purpose}</dd>
                <dt className="text-muted-foreground">Phạm vi cấp độ</dt><dd>{s.level_scope}</dd>
                <dt className="text-muted-foreground">Quyền sử dụng</dt><dd>{REUSE_LABELS[s.reuse_allowed]}</dd>
                <dt className="text-muted-foreground">Giấy phép / điều khoản</dt><dd>{s.license_name ? <>{s.license_url ? <a className="text-primary underline" href={s.license_url} target="_blank" rel="noopener noreferrer">{s.license_name}</a> : s.license_name} — </> : null}{s.license_note}</dd>
                {s.version ? (<><dt className="text-muted-foreground">Phiên bản dữ liệu</dt><dd>{s.version}{s.retrieved_at ? ` · lấy ngày ${formatDateVi(s.retrieved_at)}` : ""}</dd></>) : null}
                {(usage.get(s.id) ?? 0) > 0 ? (<><dt className="text-muted-foreground">Dữ liệu trong app</dt><dd>{usage.get(s.id)} mục</dd></>) : null}
                <dt className="text-muted-foreground">Người rà soát</dt><dd>{s.reviewed_by ?? "Chưa có"}</dd>
                <dt className="text-muted-foreground">Kiểm tra lần cuối</dt><dd>{s.last_verified ? formatDateVi(s.last_verified) : "Chưa"}</dd>
                {s.notes ? (<><dt className="text-muted-foreground">Ghi chú</dt><dd>{s.notes}</dd></>) : null}
              </dl>
            </Card>
          </li>
        ))}
      </ul>

      <details className="mt-[var(--gap)]">
        <summary className="cursor-pointer text-lg font-semibold">Hình minh họa ({images.length})</summary>
        <p className="my-2 text-sm text-muted-foreground">Mọi hình hiện có là SVG tự vẽ cho dự án, không lấy từ nguồn ngoài. Từ trừu tượng không được gán hình.</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.path} alt={i.alt_vi} className="h-12 w-12 shrink-0 rounded bg-muted object-contain" loading="lazy" />
              <span className="min-w-0"><span className="block truncate font-medium">{i.alt_vi}</span><span className="block truncate text-xs text-muted-foreground">{i.source_name}</span></span>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
