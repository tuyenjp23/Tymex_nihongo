# Nihongo Compass — 日本語学習ラボ

Nền tảng học tiếng Nhật cho người Việt: luyện thi JLPT N5–N1, hội thoại đời sống, từ vựng, Kanji, ngữ pháp, bảng chữ Hiragana/Katakana, ôn tập ngắt quãng (SM-2) và trò chơi **Kanji Quest** (có cả **Word Builder** ghép kana). Có khu quản trị `/admin` để tự thêm/sửa nội dung, đổi giao diện, bật/tắt module — không cần sửa code.

> **Đọc trước khi dùng:** toàn bộ nội dung mẫu (129 từ vựng, 88 Kanji, 26 mẫu ngữ pháp, 81 câu hỏi, 5 bộ đề, 4 bài đọc/nghe, 14 hội thoại, 18 bài học) do **AI soạn và CHƯA được người thật xác minh**. Ứng dụng luôn gắn nhãn "AI soạn – chưa xác minh" cho chúng. Câu hỏi **không phải đề thi JLPT chính thức**. Cấp N4–N1 đã có nội dung mở rộng nhưng vẫn rất ít so với một giáo trình đầy đủ. Xem mục [Những gì chưa hoàn thiện](#những-gì-chưa-hoàn-thiện).

---

## 1. Chạy thử trên máy (10 phút, không cần tài khoản nào)

### Cần cài sẵn
1. **Node.js 20.9 trở lên** (khuyên dùng bản LTS) — tải tại <https://nodejs.org>. Kiểm tra: mở terminal gõ `node -v`.
2. **VS Code** — <https://code.visualstudio.com>.

### Các bước
1. Mở VS Code → **File → Open Folder…** → chọn thư mục `nihongo-compass`.
2. Mở terminal trong VS Code: menu **Terminal → New Terminal**.
3. Cài thư viện (chỉ làm một lần, mất vài phút):
   ```bash
   npm install
   ```
4. Tạo file cấu hình với mật khẩu admin ngẫu nhiên (chỉ làm một lần):
   ```bash
   npm run setup
   ```
   Lệnh này in ra mật khẩu admin và lưu vào `.env.local`. Cần xem lại mật khẩu: mở file `.env.local`.
5. Chạy ứng dụng:
   ```bash
   npm run dev
   ```
6. Mở trình duyệt: <http://localhost:3000> (trang học) và <http://localhost:3000/admin> (quản trị).

Dừng ứng dụng: bấm `Ctrl + C` trong terminal.

> Gợi ý: trong VS Code nên cài các tiện ích **Tailwind CSS IntelliSense**, **Vitest** và **Playwright Test for VSCode** (tab Extensions, Ctrl+Shift+X). Không bắt buộc để chạy ứng dụng.

### Ở chế độ này dữ liệu nằm ở đâu?
- **Nội dung mẫu** nằm trong `content/seed/*.json` (không bị Admin sửa).
- **Thay đổi bạn làm trong Admin** được ghi vào thư mục `data/` (file JSON). Muốn quay về dữ liệu mẫu: `/admin/system` → "Khôi phục dữ liệu mẫu", hoặc xóa các file trong `data/` (trừ `.gitkeep`).
- **Tiến độ học của người học** lưu trong trình duyệt của họ (localStorage). Đổi máy/trình duyệt thì không có — dùng trang Tiến độ để xuất/nhập file sao lưu, hoặc dùng chế độ Supabase để đồng bộ.

### Mở trên điện thoại cùng Wi-Fi
1. Thêm vào `.env.local` dòng `ALLOWED_DEV_ORIGINS=192.168.1.*` (đổi cho đúng dải IP mạng nhà bạn).
2. Chạy `npm run dev:lan`, rồi mở `http://<địa-chỉ-IP-máy-tính>:3000` trên điện thoại.

---

## 2. Các lệnh hay dùng

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy để phát triển (tự nạp lại khi sửa code) |
| `npm run build` rồi `npm start` | Chạy bản production |
| `npm test` | Unit test (248 test, gồm cả test SQL/RLS) |
| `npm run test:db` | Chỉ test cơ sở dữ liệu (SQL + RLS, chạy trên PostgreSQL trong bộ nhớ, không cần Supabase) |
| `npm run test:e2e` | Test trình duyệt thật bằng Playwright (31 test). Lần đầu trên máy bạn: `npx playwright install chromium` |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run validate:content` | Kiểm tra toàn bộ nội dung (cấu trúc, nguồn gốc, liên kết, file ảnh). Thêm `-- data` để kiểm tra thư mục `data/` của Admin |
| `npm run seed:sql` | Tạo lại `supabase/seed.sql` từ `content/seed` |
| `npm run build:seed` | Dựng lại `content/seed/*.json` từ mã nguồn nội dung trong `content/src` (nội dung N5 gốc + `extra.mjs` cho N4–N1 + `quiz-sets.mjs` cho bộ đề). **Đừng sửa tay `content/seed/*.json`** — lần dựng sau sẽ ghi đè; sửa trong `content/src` rồi chạy lệnh này và `npm run seed:sql` |
| `npm run import:inspect` / `import:plan` / `import:apply` / `import:quality` … | Quy trình nhập dữ liệu có kiểm soát (xem `docs/CAP-NHAT-DU-LIEU.md`) |
| `npm run gen:images` | Tạo lại ảnh minh họa SVG trong `public/images` |

---

## 3. Thêm và sửa nội dung

**Cách dễ nhất: dùng Admin** (`/admin`). Mỗi loại nội dung có form riêng, kiểm tra lỗi ngay khi lưu.

- **Thêm một từ/Kanji/câu hỏi…**: `/admin` → chọn loại ở menu trái → **Thêm mới**.
- **Thêm hàng loạt**: `/admin/import-export` → chọn loại → xuất CSV của loại đó → sửa bằng Excel → chọn file (hoặc dán nội dung) để nhập lại. Bước đầu luôn là **chạy thử** (báo từng dòng lỗi, chưa ghi gì); chỉ khi bạn xác nhận mới ghi. Mặc định, nếu có dòng lỗi thì dừng toàn bộ.
- **Nhập dữ liệu từ nguồn mở (JMdict, KANJIDIC2, Tatoeba…)**: dùng các lệnh `npm run import:*` — xem [docs/CAP-NHAT-DU-LIEU.md](docs/CAP-NHAT-DU-LIEU.md). Luôn chạy thử trước (`import:plan`), có sao lưu, không ghi đè bản sửa tay, không xóa dữ liệu; trạng thái *Đã nhập/Dịch máy* không bao giờ tự thành *Đã xác minh*.
- **Sao lưu**: `/admin/import-export` → "Sao lưu toàn bộ" (JSON gồm mọi nội dung và cấu hình).
- Xóa một mục đang được dùng nơi khác (ví dụ nguồn đang gắn với từ vựng) sẽ bị chặn và cho biết nơi đang dùng.

### Quy tắc nguồn gốc (không thể bỏ qua)
Mỗi bản ghi có nguồn gốc và trạng thái. Hệ thống **từ chối lưu** khi:
- gắn nhãn "Mẫu chính thức" nhưng không có nguồn, hoặc nguồn không thuộc loại chính thức, hoặc quyền sử dụng lại chưa rõ;
- đặt trạng thái "Đã xác minh/Đã xuất bản" mà không có **người** rà soát và ngày xác minh, hoặc ghi AI (Claude, ChatGPT…) là người xác minh;
- trỏ tới nguồn, hình, bài đọc hoặc mục học không tồn tại.

Bản nháp không bao giờ hiện cho người học. Chi tiết: [docs/HUONG-DAN-NOI-DUNG.md](docs/HUONG-DAN-NOI-DUNG.md).

### Hình minh họa
- 38 hình SVG đi kèm do dự án tự tạo (đơn giản, minh họa nghĩa của từ cụ thể). Từ **trừu tượng** (ví dụ "tự do", "trách nhiệm") không được gán một hình đơn lẻ; các trò chơi dựa vào hình chỉ dùng từ cụ thể có hình.
- Thêm hình mới: `/admin/content/images` → tải file lên (PNG, JPG, WebP hoặc GIF; ứng dụng kiểm tra nội dung thật của file chứ không tin đuôi tên file; SVG tải lên bị từ chối vì có thể chứa mã script) và **điền nguồn + giấy phép**. Không dùng ảnh bạn không có quyền sử dụng.

---

## 4. Đổi giao diện, menu, trang chủ

Bạn có hai cách:

1. **Trong Admin** (khuyên dùng): `/admin/appearance` — màu sáng/tối, bo góc, mật độ, kiểu thẻ, font, cỡ chữ, tên/logo/favicon, thứ tự và bật/tắt từng mục menu, bố cục các khối ở trang chủ. Có cảnh báo khi màu chữ khó đọc (độ tương phản dưới chuẩn WCAG 4.5:1). Mọi lần lưu được ghi lại; mở lịch sử để **khôi phục** phiên bản cũ.
2. **Sửa mặc định trong code**: `src/config/theme.ts`, `src/config/navigation.ts`, `src/config/site.ts`, `src/config/dashboard.ts`, `src/config/games.ts`. Cấu hình lưu từ Admin sẽ **ghi đè** các giá trị mặc định này; xóa cấu hình trong Admin thì quay về mặc định.

Tắt một module (ví dụ Kanji Quest) trong menu thì đường dẫn của module đó cũng trả về "Không tìm thấy trang".

---

## 5. Dùng Supabase (đăng nhập thật, đồng bộ tiến độ, chạy online)

Chế độ này cần tài khoản Supabase (có gói miễn phí — xem trang giá hiện hành của Supabase để biết giới hạn).

> **Quan trọng:** phần dưới được kiểm chứng bằng test SQL/RLS trên PostgreSQL thật chạy cục bộ, **nhưng chưa được chạy thử trên một dự án Supabase thật** (đăng nhập, đăng ký, đồng bộ tiến độ). Hãy thử kỹ ở dự án Supabase thử nghiệm trước khi đưa người dùng thật vào.

1. Vào <https://supabase.com> → **New project**. Ghi nhớ mật khẩu database.
2. Trong dự án: **SQL Editor → New query** → lần lượt dán và **Run** từng file trong `supabase/migrations/` **theo đúng thứ tự tên file** (`20261022000001_init.sql`, `20261023000001_settings_history_prune.sql`, `20261023000002_quiz_sets.sql`, `20261024000001_import_pipeline.sql`). (Chạy lại nhiều lần vẫn an toàn.)
3. Nạp nội dung mẫu: dán toàn bộ `supabase/seed.sql` → **Run**.
4. Lấy khóa: **Project Settings → API**. Chép **Project URL** và khóa **anon / publishable** vào `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
   **Tuyệt đối không** chép khóa `service_role` vào đâu cả — ứng dụng không cần và không dùng nó.
5. **Authentication → Providers → Email**: bật. Khi thử nghiệm có thể tắt "Confirm email" cho tiện; khi chạy thật nên bật.
6. Chạy lại `npm run dev`. Vào `/account` → **Đăng ký** bằng email của bạn.
7. **Cấp quyền admin cho chính bạn** (chỉ làm được bằng SQL, đây là chủ ý — không có nút nào trên web để tự nâng quyền). Trong SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'email-cua-ban@example.com');
   ```
8. Vào `/admin/login`, đăng nhập bằng email + mật khẩu Supabase đó.

Khi đã dùng Supabase, `ADMIN_PASSWORD` và `SESSION_SECRET` không còn được dùng cho đăng nhập admin.

### Bảo mật đã áp dụng
- Row Level Security trên mọi bảng. Khách chỉ đọc nội dung đã công khai (không nháp, không ẩn). Chỉ `role = 'admin'` được ghi nội dung/cấu hình và đọc nhật ký.
- Tiến độ học: mỗi người chỉ đọc/ghi dòng của mình; **admin cũng không đọc được**.
- Nhật ký thao tác bất biến (không sửa/xóa qua API); mỗi dòng phải mang đúng tên người ghi.
- Cột trạng thái/nguồn gốc do trigger của database tự suy ra và kiểm tra, nên gọi thẳng API cũng không lách được quy tắc nguồn gốc.
- Máy chủ kiểm tra quyền ở **mọi** trang admin, mọi Server Action và mọi API route (không dựa vào việc ẩn nút). Các API ghi dữ liệu có kiểm tra `Origin`.
- Không có secret trong mã client hay biến `NEXT_PUBLIC_*` ngoài anon key.

---

## 6. Đưa lên mạng (deploy)

> Hướng dẫn từng bước cho Vercel + Supabase (kèm danh sách kiểm tra): [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md).

- **Phải dùng Supabase khi deploy** lên nền tảng serverless như Vercel: ổ đĩa ở đó chỉ đọc nên chế độ "local" (ghi file vào `data/`) không hoạt động. Ứng dụng chạy local-mode chỉ phù hợp trên máy bạn hoặc một máy chủ có ổ đĩa ghi được.
- Với Vercel: đưa mã lên GitHub (đã có `.gitignore` chặn `.env.local`, `data/`), tạo project từ repo, thêm hai biến môi trường `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`, rồi Deploy. Trong Supabase, mục **Authentication → URL Configuration** thêm địa chỉ site của bạn vào "Site URL"/"Redirect URLs".
- Chi phí: gói miễn phí của Supabase/Vercel có giới hạn riêng và có thể thay đổi — xem trang giá hiện hành của từng bên trước khi quyết định. Ứng dụng không có tính năng AI trả phí nào đang chạy.
- Ứng dụng có thể "cài" như app (PWA) trên điện thoại/máy tính; khi mất mạng chỉ hiện trang thông báo ngoại tuyến, **chưa học được offline**.

---

## 7. Cấu trúc thư mục

```
src/app/(site)/        Các trang cho người học (từ vựng, Kanji, quiz, ôn tập, games…)
src/app/admin/         Khu quản trị (đăng nhập, nội dung, nhập/xuất, giao diện, nhật ký…)
src/app/api/           API route (xuất/nhập/tải ảnh của admin, đồng bộ tiến độ)
src/components/        Thành phần giao diện
src/config/            Cấu hình MẶC ĐỊNH (site, theme, menu, dashboard, games, JLPT)
src/lib/               Logic thuần (SM-2, quiz, trò chơi, kiểm tra dữ liệu, kho dữ liệu)
src/lib/store/         FileStore (local) và SupabaseStore (production) — cùng một giao diện
content/src/           Mã nguồn nội dung mẫu;  content/seed/  JSON sinh ra từ đó
supabase/              migration SQL + seed.sql
tests/unit, tests/e2e  Vitest và Playwright
scripts/               setup, validate-content, seed-sql, generate-images
docs/                  Tài liệu thêm
```

Thiết kế chi tiết: [docs/KIEN-TRUC.md](docs/KIEN-TRUC.md).

---

## 8. Nguồn học liệu và bản quyền

Sổ nguồn (`/sources` và `/admin/content/sources`) liệt kê các nguồn đã được dùng để **kiểm tra thông tin cấu trúc kỳ thi** (JLPT: số cấp, thời gian, điểm đỗ, việc không còn công bố danh sách từ vựng/Kanji/ngữ pháp theo cấp), kèm đường dẫn, loại nguồn, ghi chú quyền sử dụng và trạng thái xác minh. Tất cả đang ở trạng thái **"Cần rà soát"** — cần một người thật mở từng nguồn, đối chiếu và ghi tên + ngày xác minh trong Admin.

- Dự án **không sao chép** đề thi, sách giáo trình hay hình ảnh có bản quyền, và không thu thập dữ liệu từ website nào.
- Bộ nội dung mẫu là văn bản tự soạn (nhờ AI) để minh họa cấu trúc; chưa thể coi là giáo trình.
- Điểm thi thử chỉ là **tỉ lệ đúng thô**. JLPT chấm theo thang điểm quy đổi (equating) mà ứng dụng không mô phỏng, nên không có "điểm JLPT dự đoán".
- Trước khi dùng nội dung từ nguồn khác, hãy đọc điều khoản của họ và ghi đúng loại giấy phép/quyền vào sổ nguồn.

---

## Những gì chưa hoàn thiện

Đây là danh sách trung thực về những gì **chưa làm hoặc chưa kiểm chứng**:

**Nội dung**
- Toàn bộ nội dung do AI soạn, chưa có người xác minh; cần giáo viên/người bản ngữ rà soát trước khi dùng dạy thật. Cách rà soát: mở từng mục trong Admin, sửa nếu sai, rồi đổi trạng thái sang "Đã xác minh" kèm tên bạn và ngày.
- Lượng nội dung nhỏ: N5 có 39 câu hỏi, N4 có 14, N3 có 10, N2 và N1 mỗi cấp 9 câu; từ vựng N4–N1 chỉ 11–26 từ mỗi cấp. Chưa có bộ từ vựng/Kanji/ngữ pháp đầy đủ theo cấp (JLPT hiện không công bố danh sách chính thức nên không có "danh sách chuẩn" để đối chiếu).
- Mô-đun Hiragana/Katakana (bảng chữ, luyện nhận mặt chữ) đã có; chưa có bài tập tập viết nét bằng tay.
- Phần nghe dùng giọng đọc có sẵn của trình duyệt (chất lượng tùy máy/trình duyệt, có thể không có giọng tiếng Nhật); chưa có file âm thanh thu sẵn.
- "Bộ đề" (`quiz_sets`) soạn được trong Admin (chọn câu hỏi từ kho, thứ tự, trộn hay không). Bộ đề dùng câu hỏi do AI soạn nên cũng mang nhãn chưa xác minh.

**Kiểm chứng**
- `SupabaseStore`, đăng ký/đăng nhập học viên, đăng nhập admin bằng Supabase và đồng bộ tiến độ `/api/progress` **chưa được chạy trên Supabase thật**. SQL, RLS và trigger đã được test; phần nối giữa ứng dụng và Supabase Auth thì chưa.
- Chưa test trên Safari/Firefox và điện thoại thật; test trình duyệt chạy trên Chromium (cả khung desktop và khung điện thoại).
- Chưa kiểm tra bằng trình đọc màn hình thật; chỉ áp dụng các thực hành cơ bản (nhãn, focus, tương phản, `prefers-reduced-motion`).

**Giới hạn kỹ thuật**
- Tải ảnh lên trong Admin chỉ hoạt động ở chế độ local; chế độ Supabase hiện nhập ảnh bằng đường dẫn/URL (chưa dùng Supabase Storage).
- Đồng bộ tiến độ là thủ công ("Đồng bộ ngay") và gộp không mất dữ liệu nhưng hai thiết bị cùng sửa một lúc có thể cho kết quả "bản mới hơn thắng" ở một số trường.
- Bảo vệ chỉnh sửa đồng thời: nếu hai admin mở cùng một mục/cấu hình, người lưu sau bị báo "đã được người khác lưu" và phải tải bản mới. Ở chế độ Supabase việc kiểm tra và ghi là hai bước riêng (khoảng hở cỡ mili-giây), chưa khóa ở mức cơ sở dữ liệu.
- Khôi phục từ file sao lưu (`/admin/import-export`): chạy thử trước, ghi tất cả hoặc không ghi gì, chỉ thêm/cập nhật theo ID và **không bao giờ xóa** mục hiện có. Chưa thử trên Supabase thật.
- Lịch sử cấu hình giữ 25 phiên bản gần nhất ở cả hai chế độ (Supabase tự dọn bằng migration `20261023000001`, chưa chạy thử trên Supabase thật).
- Trang `/progress` và trang chủ gửi danh sách mục đầy đủ xuống trình duyệt; với bộ dữ liệu rất lớn (hàng chục nghìn mục) cần phân trang.
- Trang "không tồn tại" trả mã HTTP 200 (do màn hình tải) dù hiển thị nội dung 404 — không ảnh hưởng người dùng nhưng công cụ tìm kiếm có thể coi là trang thường.
- Word Builder chỉ dùng từ có cách đọc là kana thuần, 2–6 mảnh; từ khác bị bỏ qua. Chưa kiểm thử kéo-thả bằng điện thoại thật (nhấn chọn mảnh thì đã test).
- Cookie phiên admin chỉ gắn cờ `secure` khi chạy sau HTTPS (đúng cho deploy; chạy `http://localhost` thì không).
- Chế độ AI (soạn nội dung bằng AI) **chưa được xây dựng**; biến `AI_PROVIDER_API_KEY` trong `.env.example` hiện không được dùng.

**Việc nên làm tiếp (gợi ý theo thứ tự)**
1. Chạy thử chế độ Supabase trên dự án thử nghiệm và ghi lại lỗi nếu có.
2. Nhờ giáo viên rà soát nội dung N5 và đánh dấu "Đã xác minh".
3. Bổ sung thêm nội dung N4–N1 và nguồn có giấy phép rõ ràng.
4. Thêm âm thanh thu sẵn (giọng người thật).

---

## Giấy phép

Chưa chọn giấy phép cho mã nguồn; hãy thêm file `LICENSE` phù hợp trước khi chia sẻ công khai.
