# Đưa Nihongo Compass lên Vercel cho mọi người dùng thử

Mục tiêu: một địa chỉ công khai (ví dụ `https://tymexnihongo.vercel.app`) để người khác vào học thử. Cách này dùng **Supabase** (bắt buộc trên Vercel, vì ổ đĩa của Vercel chỉ đọc nên chế độ "local" không ghi được dữ liệu).

> **Trung thực về mức kiểm chứng:** SQL, RLS và trigger đã được test trên PostgreSQL thật chạy cục bộ; ứng dụng build production và chạy e2e ở chế độ local. **Phần nối ứng dụng ↔ Supabase thật (đăng ký, đăng nhập, đồng bộ tiến độ, Admin) chưa từng được chạy trên một dự án Supabase thật.** Hãy làm theo mục 6 để tự kiểm tra trước khi mời nhiều người.

Địa chỉ `tymexnihongo.vercel.app` chỉ có nếu tên đó còn trống: tên dự án bạn đặt trên Vercel quyết định tên miền `*.vercel.app`. Nếu bị trùng, Vercel sẽ gợi ý tên khác (hoặc bạn gắn tên miền riêng).

## 1. Chuẩn bị mã nguồn trên GitHub

1. Tạo repository **riêng tư (Private)** trên GitHub, ví dụ `tymex-nihongo`.
2. Trong thư mục dự án (PowerShell):
   ```
   git init
   git add .
   git status
   ```
   Kiểm tra `git status` **không** có: `.env.local`, thư mục `data/`, `node_modules/`, `japanese-language-data-main/` (đã được `.gitignore` chặn). Nếu thấy, dừng lại và báo lại.
3. ```
   git commit -m "Nihongo Compass"
   git branch -M main
   git remote add origin https://github.com/<tài-khoản>/tymex-nihongo.git
   git push -u origin main
   ```

## 2. Tạo dự án Supabase

1. <https://supabase.com> → **New project** (chọn vùng gần người dùng, ví dụ Singapore/Tokyo). Ghi nhớ mật khẩu database.
2. **Cách nhanh:** **SQL Editor → New query**, dán toàn bộ file `supabase/setup-all.sql` (đã gộp sẵn 4 migration theo đúng thứ tự) → **Run**, rồi dán `supabase/seed.sql` → **Run**. Bỏ qua phần liệt kê dưới đây nếu dùng cách này. (File gộp được sinh từ các migration; nếu bạn sửa migration, gộp lại bằng cách nối các file theo thứ tự tên.)
   **Cách từng file:** lần lượt dán nội dung từng file rồi bấm **Run** — **đúng thứ tự**:
   1. `supabase/migrations/20261022000001_init.sql`
   2. `supabase/migrations/20261023000001_settings_history_prune.sql`
   3. `supabase/migrations/20261023000002_quiz_sets.sql`
   4. `supabase/migrations/20261024000001_import_pipeline.sql`
   5. `supabase/seed.sql` (nội dung mẫu; ~500 KB, dán có thể chậm vài giây). Chạy lại nhiều lần vẫn an toàn.
3. **Authentication → Providers → Email**: bật. Cho bản dùng thử công khai, nên **bật "Confirm email"** (tránh đăng ký bằng email giả). Nếu tắt để thử nhanh, hãy bật lại trước khi công bố rộng.
4. **Project Settings → API**: chép **Project URL** và khóa **anon/publishable**.
   **Tuyệt đối không** dùng/chép khóa `service_role` ở bất kỳ đâu.

## 3. Tạo dự án trên Vercel

1. <https://vercel.com> → **Add New… → Project** → chọn repo GitHub vừa đẩy.
2. **Project Name**: `tymexnihongo` (để có `tymexnihongo.vercel.app` nếu còn trống). Framework tự nhận là Next.js.
3. **Environment Variables** — chỉ thêm hai biến này (cho Production, Preview, Development):
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ... (khóa anon/publishable)
   ```
   Không cần `ADMIN_PASSWORD`/`SESSION_SECRET` ở chế độ Supabase. Biến `NEXT_PUBLIC_*` được nhúng lúc build, nên nếu đổi giá trị phải **Redeploy**.
4. **Deploy**.

## 4. Cho Supabase biết địa chỉ site

**Authentication → URL Configuration**:
- **Site URL**: `https://tymexnihongo.vercel.app`
- **Redirect URLs**: thêm `https://tymexnihongo.vercel.app/**`

Thiếu bước này, email xác nhận sẽ trỏ về sai địa chỉ.

## 5. Cấp quyền admin cho chính bạn

1. Mở site → `/account` → **Đăng ký** bằng email của bạn (xác nhận email nếu đã bật).
2. Trong Supabase **SQL Editor**:
   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'email-cua-ban@example.com');
   ```
3. Vào `/admin/login` đăng nhập bằng email + mật khẩu đó.

Không có nút nào trên web để tự nâng quyền — đây là chủ ý. Người khác đăng ký chỉ có vai trò học viên.

## 6. Kiểm tra sau khi đưa lên (làm đủ trước khi mời mọi người)

- [ ] Trang chủ, `/vocabulary`, `/kanji`, `/jlpt`, `/games`, `/search`, `/sources` mở được khi **chưa đăng nhập**, hiển thị nội dung mẫu.
- [ ] Làm một câu quiz; tiến độ lưu trong trình duyệt.
- [ ] Đăng ký bằng email thứ hai → nhận email xác nhận → đăng nhập → "Đồng bộ ngay" ở `/progress` hoặc `/account` không báo lỗi.
- [ ] Đăng nhập bằng tài khoản **học viên**, mở `/admin` → bị chặn (không vào được).
- [ ] Đăng nhập admin → `/admin/content/vocabulary` thêm thử một từ, người học (cửa sổ ẩn danh) thấy từ đó kèm nhãn chưa xác minh; sau đó xóa.
- [ ] `/admin/audit` ghi lại thao tác.
- [ ] Trên điện thoại thật: mở site, thanh dưới và quiz dùng được.

Nếu một mục lỗi, ghi lại thông báo lỗi (Vercel → **Logs**, Supabase → **Logs**) rồi báo lại — **đừng bật `service_role` để "chữa cháy"**.

## 7. Lưu ý cho bản công khai

- **Nội dung đều do AI soạn, chưa có người xác minh** (trạng thái hiển thị cho người học). Nên nói rõ với người dùng thử đây là bản thử nghiệm.
- **Dữ liệu nhập từ JMdict/KANJIDIC2/Tatoeba chưa nằm trong bản công khai** (bạn chọn chưa đưa lên). Khi muốn đưa lên: nhập trên máy (`docs/CAP-NHAT-DU-LIEU.md`), rà soát, rồi dùng "Sao lưu toàn bộ" → "Khôi phục" ở `/admin/import-export` trên site Supabase. Khi đó phải giữ trang ghi công `/sources#ghi-cong` và tuân thủ CC BY-SA/EDRDG.
- Gói miễn phí của Supabase/Vercel có giới hạn riêng (dung lượng, băng thông, **dự án không hoạt động có thể bị tạm dừng**) và có thể thay đổi — xem trang giá/điều khoản hiện hành của từng bên.
- Ứng dụng không có tính năng AI trả phí nào đang chạy nên không phát sinh chi phí API AI.
- Trang `/admin/login` công khai trên mạng; an toàn dựa vào Supabase Auth + vai trò + kiểm tra quyền phía máy chủ. Dùng mật khẩu admin dài, riêng biệt, và cân nhắc bật xác thực hai bước cho tài khoản Supabase/GitHub/Vercel của bạn.
- Mỗi lần sửa code: `git add . && git commit -m "..." && git push` → Vercel tự build lại. Sau khi sửa nội dung mẫu trong `content/src`: chạy `npm run build:seed` và `npm run seed:sql`, rồi chạy lại `supabase/seed.sql` (chỉ thêm bản ghi mới, không ghi đè bản đã sửa trong Admin).
