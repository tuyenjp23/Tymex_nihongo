# Kiến trúc Nihongo Compass

## Tổng quan
Next.js (App Router) + TypeScript + Tailwind. Mọi trang cho người học là Server Component đọc dữ liệu qua **một giao diện lưu trữ duy nhất** (`ContentStore`), có hai bản cài đặt:

| | FileStore (local/demo) | SupabaseStore (production) |
|---|---|---|
| Chọn khi | Không có `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` | Có cả hai |
| Nội dung | `content/seed/*.json` + thay đổi của Admin trong `data/*.json` | Bảng PostgreSQL (`id, level, status, hidden, origin, source_id, data jsonb`) |
| Admin đăng nhập | `ADMIN_PASSWORD` + cookie ký HMAC (`SESSION_SECRET`) | Supabase Auth + `profiles.role = 'admin'` |
| Tiến độ học | localStorage | localStorage **và** bảng `user_progress` (đồng bộ thủ công khi đăng nhập) |
| Bảo vệ | Kiểm tra ở server | Kiểm tra ở server **và** RLS/trigger trong database |

Thêm một bản cài đặt khác (ví dụ Postgres thuần) = viết lớp mới theo `src/lib/store/types.ts`.

## Dòng dữ liệu một lần sửa trong Admin
```
Form / CSV / JSON
  → Server Action hoặc API route
  → adminOrNull() / requireAdminApi()      (kiểm tra quyền ở server; API ghi còn kiểm tra Origin)
  → validateRecord()                       (chuẩn hóa → Zod → nguồn gốc → liên kết)
  → store.upsert()                         (ghi + audit log)
  → revalidate trang người học
```
`src/proxy.ts` chỉ là cổng chặn sớm cho UX; **quyền thật** được kiểm tra lại trong layout, từng trang admin, từng action, từng API.

## Mô-đun chính (`src/lib`)
- `schemas.ts`, `types.ts`: kiểu dữ liệu & Zod cho 9 loại nội dung (nguồn, hình, từ vựng, Kanji, ngữ pháp, câu hỏi, bài đọc/nghe, hội thoại, bài học).
- `provenance.ts`, `admin/validate.ts`: quy tắc nguồn gốc & liên kết (hàm thuần, có test).
- `admin/importer.ts`: nhập hàng loạt dạng chạy thử → kế hoạch từng dòng → ghi.
- `srs.ts`, `review.ts`, `streak.ts`, `scoring.ts`, `quiz.ts`: SM-2 (ease ≥ 1,3), hàng đợi ôn tập, chuỗi ngày học (1 ngày nghỉ), chấm điểm thô theo phần.
- `games/`: `builders.ts` (mỗi chế độ chơi một hàm sinh câu hỏi), `distractors.ts` (chọn đáp án nhiễu), `engine.ts` (reducer điểm/combo), `focus.ts` (mục cần chú ý cho Daily Review).
- `progress/`: `model.ts` (Zod + hàm bất biến + `mergeProgress`), `store.ts` (localStorage, `useSyncExternalStore`), `sync.ts`, `badges.ts`.
- `settings*.ts`, `theme.ts`: cấu hình ghi đè (5 khóa: theme, navigation, dashboard, content, games), lịch sử phiên bản, kiểm tra tương phản, sinh CSS an toàn.
- `store/`: hai bản cài đặt lưu trữ + `promoted.ts` (cột suy ra từ `data`, dùng chung cho app và trigger test).

## Thêm một chế độ chơi Kanji Quest
1. Viết hàm `buildXxx(items, options, rng)` trong `src/lib/games/builders.ts` (thuần, trả `GameQuestion[]`).
2. Khai báo chế độ trong `src/config/games.ts` (`status: "available"`).
3. Nối vào `src/components/games/game-runner.tsx` (chọn builder theo `mode.id`).
4. Viết test trong `tests/unit/learning.test.ts`. Bật/tắt chế độ ở `/admin/games`.

## Thêm một loại nội dung mới
Cần sửa đồng bộ: `types.ts` (COLLECTION_KEYS) → `schemas.ts` → `admin/field-specs.ts` (form + cột CSV) → `admin/validate.ts` (liên kết) → `store/promoted.ts` → migration SQL (bảng + trigger) → `scripts/seed-sql.mjs` (TABLES). Test khứ hồi CSV trong `tests/unit/admin.test.ts` tự phủ loại mới khi thêm vào `COLLECTION_KEYS`.

## Cơ sở dữ liệu (`supabase/migrations`)
- RLS bật ở mọi bảng; `revoke all` rồi cấp lại tối thiểu theo vai trò.
- `is_admin()` là `SECURITY DEFINER` để policy không bị đệ quy.
- `content_guard()` (trigger): suy ra cột `level/status/hidden/origin/source_id` từ `data` và lặp lại quy tắc nguồn gốc ở tầng DB.
- `audit_logs`: chỉ thêm; `actor_id` phải là chính người ghi.
- `user_progress`: chỉ chủ sở hữu đọc/ghi; admin không đọc được.
- Test: `tests/unit/db/*` chạy SQL thật trên PGlite (không cần Supabase).

## Kiểm thử
- `tests/unit`: Vitest, hàm thuần + FileStore + SQL/RLS.
- `tests/e2e`: Playwright, khởi động app production với thư mục dữ liệu tạm (`scripts/e2e-server.mjs`) nên **không đụng `data/` của bạn**.

## Bổ sung (phiên bản hoàn thiện)
- **Chỉnh sửa đồng thời**: `expectedUpdatedAt` (bản ghi) và `expectedVersion` (cấu hình) được kiểm tra bên trong `FileStore`/`SupabaseStore`; sai khác → `StoreError("conflict")`, giao diện hiện cảnh báo và nút tải bản mới.
- **Khôi phục sao lưu**: `src/lib/admin/restore.ts` (`planRestore`, định dạng `{app:"nihongo-compass", format:1, collections, settings}`) + `/api/admin/restore`. Thứ tự áp dụng theo `RESTORE_ORDER` để tham chiếu luôn hợp lệ.
- **quiz_sets**: thêm vào `COLLECTION_KEYS`, `schemas.ts`, `field-specs.ts`, `validate.ts`, `TABLES`, `seed-sql.mjs`, migration `20261023000002_quiz_sets.sql`.
- **Word Builder**: logic thuần `src/lib/games/word-builder.ts`, màn chơi `src/components/games/word-builder-game.tsx`.
- **CI**: `.github/workflows/ci.yml` chạy typecheck, unit test, kiểm tra nội dung, kiểm tra seed khớp bộ sinh, build, rồi Playwright.

## Quy trình nhập dữ liệu (`src/lib/import`, `scripts/import.ts`)
- `stream-json.ts` đọc file JSON lớn theo luồng; `normalize.ts` chuyển JMdict/KANJIDIC2/Tatoeba sang schema của ứng dụng; `merge.ts` quyết định tạo/bỏ qua/cập nhật (không ghi đè sửa tay, không xóa); `plan.ts` gom thành kế hoạch và áp cổng nguồn/giấy phép; `run.ts` thực thi (khóa, sao lưu, ghi theo lô, đọc lại kiểm tra, điểm kiểm tra, hoàn tác); `report.ts` ghi báo cáo; `quality.ts` kiểm tra chất lượng.
- Bản ghi nhập mang `import` {source_id, external_id, dataset_version, run_id, license, content_hash, base_hash}; `base_hash` dùng để phát hiện Admin đã sửa.
- Dùng lại `validateRecord` (Zod + nguồn gốc + tham chiếu) của Admin; chỉ ghi qua `FileStore`.
- Trang Admin `/admin/data-sources`, `/admin/data-quality`; trang người học `/sources#ghi-cong`.
- Kiểm thử: `tests/unit/import.test.ts` (dữ liệu giả nhỏ) và `tests/e2e/import.spec.ts` (e2e nạp `tests/fixtures/mini-dataset` qua đúng lệnh `import:apply`; dữ liệu giả, không phải dữ liệu học).

## Lớp dữ liệu nhập sẵn và danh sách lớn
- `src/lib/store/base-layer.ts` đọc `content/imported/<collection>.json` (cache theo mtime, chỉ đọc); `layered-store.ts` (`LayeredStore`) bọc FileStore/SupabaseStore trong `getStore()`: list = kho + bản nhập sẵn kho chưa có (kho thắng theo ID); sửa mục nhập sẵn → tạo bản ghi cùng ID trong kho (kiểm tra xung đột theo `updated_at` của bản nhập sẵn); xóa mục chỉ có ở lớp nhập sẵn bị từ chối (dùng Ẩn); `listOwn` = chỉ phần trong kho (dùng cho sao lưu).
- `src/lib/import/export-base.ts` + lệnh `import:export-base` tạo lớp này từ thư mục dữ liệu đã nhập (kiểm tra schema, ID trùng, manifest).
- Danh sách lớn (Từ vựng, Kanji): `src/lib/listing.ts` (đọc tham số URL an toàn, lọc, phân trang, link) + `components/content/server-explorer.tsx` (form GET, lọc trên server) + `explorer-list.tsx` (client, chỉ vẽ 1 trang và dấu "đã xem"). Chuỗi tìm kiếm tính một lần cho mỗi bản ghi (`src/lib/memo-index.ts`, WeakMap). Các danh sách nhỏ (Ngữ pháp, Bài học, Hội thoại) vẫn dùng `Explorer` lọc ở trình duyệt.
- "Đã xem x/y" theo cấp: server chỉ gửi tổng; trình duyệt tải bảng mã→cấp từ `/api/item-levels` (`src/lib/item-levels.ts`, `use-item-levels.ts`).
- `next.config.ts` khai báo `outputFileTracingIncludes` để Vercel đóng gói `content/imported` cùng các hàm server (đã kiểm tra trong `.nft.json` sau build).
- Kiểm thử: `tests/unit/layered-store.test.ts`, `listing.test.ts`, `export-base.test.ts`; `tests/e2e/base-layer.spec.ts` (server e2e dùng bản trích `tests/fixtures/imported`).
