# Nhập và cập nhật dữ liệu học tập từ nguồn đáng tin cậy

Tài liệu này mô tả quy trình **có kiểm soát** để đưa dữ liệu từ các bộ dữ liệu mở vào Nihongo Compass. Ứng dụng **không bao giờ tự nhập dữ liệu khi mở**; mọi lần nhập là một lệnh bạn chủ động chạy.

> Phạm vi hiện tại: nhập **từ vựng, kanji, câu ví dụ** theo nhóm cấp độ **JLPT N5 → N1** từ thư mục `japanese-language-data-main` (jkindrix/japanese-language-data). **Ngữ pháp chưa được nhập** (bộ dữ liệu không có dữ liệu ngữ pháp đáng tin cậy). Đường nhập chỉ dành cho **kho local (FileStore)**; với Supabase xem mục 9.

## 1. Nguồn nào được phép, nguồn nào không

| Nguồn | Trạng thái | Ghi chú |
|---|---|---|
| JMdict (qua jmdict-simplified trong bộ dữ liệu) | **Được nhập** | CC BY-SA 4.0 + EDRDG Licence. Phải ghi công, không nhận bản quyền, nên cập nhật định kỳ |
| KANJIDIC2 | **Được nhập** | Như trên. Các trường §8 (mã tra cứu từ sách có bản quyền) bị loại |
| Tatoeba (qua jmdict-examples) | **Được nhập** | CC BY 2.0 FR. Bộ dữ liệu không có tên tác giả từng câu → mỗi câu có liên kết tới trang gốc ghi tên người đóng góp |
| Danh sách JLPT của Waller (trong bộ dữ liệu) | **Được nhập** (chỉ để gán cấp) | Danh sách **cộng đồng**, không phải chính thức. UI luôn ghi rõ |
| jkindrix/japanese-language-data | **Được nhập** (gói chứa các nguồn trên) | CC BY-SA 4.0 (ShareAlike) |
| KanjiVG | Đã đăng ký trong sổ nguồn, **chưa tích hợp** | CC BY-SA 3.0 |
| JLPT chính thức, Japan Foundation, IRODORI, Marugoto, Erin's Challenge | **Bị chặn nhập** (chỉ liên kết) | Nội dung có bản quyền / không có giấy phép cho phép tái sử dụng. Công cụ từ chối nhập tự động |

Cổng kiểm tra (`sourceGate`, `inspectDataset`) chặn nhập khi: nguồn chưa đăng ký; `import_policy` ≠ `allowed`; `reuse_allowed` là `no`/`unknown`; manifest hoặc file dữ liệu có giấy phép khác dự kiến. Phiên bản khác phiên bản đã kiểm tra chỉ cảnh báo.

## 2. Quy trình chuẩn (mỗi lần cập nhật)

1. **Lấy bộ dữ liệu mới** (tải thủ công từ trang gốc, giải nén vào `japanese-language-data-main/` hoặc đường dẫn khác). Công cụ **không tải gì từ internet**.
2. **Kiểm tra truy cập, định dạng, phiên bản, giấy phép**:
   ```
   npm run import:inspect
   ```
   Kết quả nêu phiên bản, giấy phép, SHA-256 từng file và nguồn nào được phép. Dừng nếu có "Vấn đề".
3. **Sao lưu** (tự động khi `apply`, nhưng nên chủ động trước đợt lớn):
   ```
   npm run import:backup
   ```
4. **Chạy thử** một nhóm nhỏ (không ghi gì vào dữ liệu, chỉ ghi báo cáo):
   ```
   npm run import:plan -- --group jlpt-n5 --limit 40
   ```
5. **Đọc báo cáo** trong `data/import/reports/*.md` (số thêm mới / cập nhật / bỏ qua / lỗi, lý do bỏ qua, cảnh báo, nghĩa vụ ghi công).
6. **Dịch tiếng Việt** (tùy chọn, xem mục 5), rồi **nhập thật**:
   ```
   npm run import:apply -- --group jlpt-n5 --limit 40 --yes
   ```
   Thiếu `--yes` thì lệnh chỉ chạy thử. **Hãy dừng chỉnh sửa trong Admin trong lúc `apply` chạy** (có file khóa `data/import/.lock`, nhưng Admin không kiểm tra khóa này).
7. **Kiểm tra chất lượng**:
   ```
   npm run import:quality
   npm run validate:content -- data
   ```
8. **Mở rộng** bỏ `--limit`, rồi tiếp các nhóm `jlpt-n4`, `jlpt-n3`, `jlpt-n2`, `jlpt-n1` — **từng nhóm một**, xem báo cáo trước khi sang nhóm kế.
9. **Rà soát trong Admin** (`/admin/data-sources`, `/admin/data-quality`, danh sách nội dung lọc theo nguồn / "nghĩa Việt là dịch máy"), chuyển trạng thái sang Đã xác minh / Xuất bản **bằng tay**.

Sau mỗi lần `apply`, công cụ tự cập nhật ngày lấy dữ liệu và lịch sử cập nhật của các nguồn đã dùng.

## 3. Công cụ làm gì với từng bản ghi

- **Phân nhóm**: nhóm `jlpt-nX` lấy các mục có cấp X theo danh sách Waller. Mục **không có cấp thì không được nhập** (không tự gán cấp).
- **ID ổn định**: từ `jm-<mã JMdict>`, kanji `kj-<mã Unicode>`, câu `tatoeba-<số>` → chạy lại không tạo bản trùng.
- **Không gộp mục chỉ vì cùng chữ viết**: hai mục JMdict khác nhau cùng chữ + cách đọc được giữ riêng (báo là "homograph"). Mục trùng **chữ + cách đọc** với từ đã có trong kho bị **bỏ qua** (giữ nguyên bản có sẵn), câu ví dụ được nối với mục đã có.
- **Nhiều nghĩa / nhiều cách đọc**: lưu từng nghĩa với loại từ, ghi chú; dạng chữ/cách đọc khác lưu riêng.
- **Nghĩa tiếng Việt không bao giờ tự bịa**: mặc định trống (`vi_kind = missing`, trạng thái *Đã nhập*). Nghĩa gốc tiếng Anh hiển thị kèm nhãn "EN".
- **Câu ví dụ**: lọc độ dài, URL, ký tự lạ, nội dung nhạy cảm; loại câu trùng; tối đa 3 câu/từ; có liên kết nguồn + giấy phép; **không gán cấp**.
- **Lọc nội dung nhạy cảm**: nghĩa/câu có thẻ tục tĩu của JMdict bị bỏ và được đếm trong báo cáo. Đây chỉ là bộ lọc cơ bản, **không thay cho việc rà soát**.
- **Không ghi đè chỉnh sửa của Admin**: bản ghi tạo thủ công, bản ghi đã sửa sau khi nhập (so băm nội dung), bản ghi đã được người xác minh đều bị bỏ qua. Lý do hiện trong báo cáo. Lưu ý: *mọi* thay đổi trường (kể cả ẩn/hiện) được tính là "đã sửa".
- **Không bao giờ xóa dữ liệu.**
- **Trạng thái**: *Đã nhập* → *Dịch máy* (khi nạp bản dịch) → *Cần rà soát* → *Đã xác minh* → *Xuất bản*. Công cụ **không bao giờ** tự đặt *Đã xác minh*.

## 4. Báo cáo, nhật ký, sao lưu, tiếp tục, hoàn tác

Tất cả nằm trong `data/import/` (không đưa lên Git):

| Thư mục | Nội dung |
|---|---|
| `reports/` | Báo cáo JSON + Markdown mỗi lần chạy (kể cả chạy thử) |
| `logs/` | Nhật ký chi tiết |
| `backups/<runId>/` | Bản sao các file `data/*.json` **trước khi** ghi |
| `state.json` | Điểm kiểm tra theo lô (mặc định 200 bản ghi/lô) |

- **Bị dừng giữa chừng**: `npm run import:resume -- --run <runId> --group <nhóm>` (dùng lại bản sao lưu cũ). Chạy lại cùng lệnh `apply` cũng an toàn (idempotent: lần 2 báo "Không có thay đổi").
- **Hoàn tác**: `npm run import:rollback -- --run <runId>` (chạy thử) rồi thêm `--yes`. Xóa các bản ghi do lần đó **tạo** nếu chưa bị sửa và chưa được nơi nào tham chiếu; khôi phục bản ghi do lần đó **cập nhật** từ bản sao lưu nếu chưa bị sửa. Bản ghi đã bị sửa hoặc đang được dùng được giữ nguyên và báo rõ.
- Toàn bộ dữ liệu có thể khôi phục thủ công bằng cách chép file trong `backups/<runId>/` về `data/` khi ứng dụng đang tắt.

## 5. Bản dịch tiếng Việt (dịch máy, có gắn nhãn)

1. Xuất danh sách mục thiếu nghĩa Việt:
   ```
   npm run import:translate-export -- --group jlpt-n5 --limit 40 --out cho-dich.jsonl
   ```
2. Điền trường `"vi"` (mỗi dòng JSON một mục; `vi` rỗng = chưa dịch) và lưu vào `content/import/translations-vi.jsonl` (file này được nạp tự động) hoặc truyền `--translations <file>`. Dòng có dạng `{"collection":"vocabulary","id":"jm-1001820","vi":"tiền","by":"AI (Claude)"}`.
3. Chạy `import:apply`. Mục có bản dịch được đánh dấu `vi_kind = machine_translated`, trạng thái **Dịch máy**; giao diện người học hiển thị nhãn "dịch máy, chưa kiểm tra" và `import:quality` cảnh báo cho tới khi người duyệt.
4. Admin sửa nghĩa → chọn loại bản dịch "Người dịch/đã xác minh" → chuyển trạng thái.

Trò chơi, ôn tập, thẻ ghi nhớ, Word Builder **chỉ dùng mục có nghĩa tiếng Việt**; mục chỉ có nghĩa tiếng Anh vẫn tra cứu được ở từ vựng/tìm kiếm.

File mẫu trong `content/import/translations-vi.jsonl` là bản dịch máy **chưa được người kiểm tra**, soạn bởi AI cho tập thử N5 (40 mục đầu của nhóm). Hãy rà soát trước khi chuyển sang Đã xác minh.

## 6. Dữ liệu dùng chung cho mọi mô-đun

Dữ liệu nhập vào **cùng collection** `vocabulary` / `kanji` / `sentences` mà từ vựng, tìm kiếm, thẻ ghi nhớ, luyện từ, Kanji Quest, Ôn tập hằng ngày và tiến độ đang đọc — không có bản sao riêng cho từng trò chơi. Mục ẩn (`hidden`) không hiện cho người học.

## 7. Giấy phép và nghĩa vụ ghi công (tóm tắt)

- **CC BY-SA 4.0 (ShareAlike)**: nếu bạn công bố/phân phối lại dữ liệu đã chỉnh sửa, phải dùng cùng giấy phép và ghi công. Dùng nội bộ để học thì ít ràng buộc, nhưng nên giữ nguyên ghi công.
- **EDRDG Licence**: ghi công (đã có tại `/sources#ghi-cong`), không nhận bản quyền JMdict/KANJIDIC2, nên cập nhật định kỳ.
- **Tatoeba CC BY 2.0 FR**: ghi công; mỗi câu có liên kết tới trang gốc.
- Đây là tóm tắt kỹ thuật, **không phải tư vấn pháp lý**; hãy đọc giấy phép gốc nếu định phát hành công khai.

## 8. Trang Admin liên quan

- `/admin/data-sources` — nguồn nào đang dùng, giấy phép, phiên bản, số bản ghi theo nguồn, lịch sử cập nhật, các lần nhập gần đây.
- `/admin/data-quality` — kết quả kiểm tra chất lượng (thiếu cách đọc/nghĩa/nguồn/giấy phép, dịch máy chưa duyệt, câu trùng, cấp độ không có nguồn…).
- Danh sách nội dung: bộ lọc `source` và `vi` (thiếu / dịch máy), tìm kiếm, sửa, ẩn, xuất CSV/JSON.

## 9. Giới hạn đã biết

- Công cụ ghi vào **kho local**. Với Supabase: nhập trên máy local rồi dùng "Sao lưu toàn bộ" → khôi phục ở Admin (hoặc sinh SQL seed); **chưa thử trên Supabase thật**.
- Chỉ có dữ liệu tiếng Anh; tiếng Việt chỉ từ bản dịch máy có gắn nhãn hoặc do người nhập.
- Nhập đầy đủ N5–N1 sẽ tạo hàng chục nghìn bản ghi: trang "Từ vựng/Kanji" gửi toàn bộ danh sách xuống trình duyệt, cần phân trang trước khi nhập hết (chưa làm).
- Bộ lọc nội dung nhạy cảm là heuristic.
- Phiên bản bộ dữ liệu đã kiểm tra: 0.9.0 (JMdict/KANJIDIC2 3.6.2, từ điển ngày 2026-04-06).
