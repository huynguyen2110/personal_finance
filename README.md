# Chi tiêu cá nhân

Web theo dõi thu chi cá nhân. Giao dịch ngân hàng được ghi nhận bằng cách **đọc email thông báo của ngân hàng** (không qua bên thứ ba), tự phân loại theo quy tắc, có ngân sách, thống kê và xuất Excel.

Stack: Next.js 16, Prisma 5, MySQL 8 (Laragon), Tailwind 4, Recharts, ExcelJS, imapflow + mailparser.

## Chạy lần đầu

```bash
npm install
cp .env.example .env        # điền SESSION_SECRET, ADMIN_PASSWORD, IMAP_USER, IMAP_PASSWORD...
npx prisma migrate deploy   # tạo bảng trong DB personal_finance (tạo DB trước trong HeidiSQL/Laragon)
npm run seed                # tài khoản đăng nhập, danh mục mặc định, quy tắc mẫu, ví tiền mặt
npm run seed:demo           # (tùy chọn) ~6 tháng giao dịch giả để xem thống kê
npm run build && npm start  # chạy ở http://localhost:3002
```

## Mỗi ngân hàng một cách ghi nhận

| Ngân hàng | Cách ghi nhận | Ghi nhận được |
|---|---|---|
| **Vietcombank** | Email "Biên lai chuyển tiền" | Chỉ tiền **ra** do bạn tự chuyển từ VCB Digibank |
| **Cake** | Email "Cake xin thông báo … vừa mới phát sinh giao dịch" | Tiền **ra và vào** (số tiền có dấu −/+) |
| **ACB** | Email từ mailalert@acb.com.vn "… đã thay đổi số dư" | Tiền **ra và vào** (Ghi nợ/Ghi có), **kèm số dư mới** |
| Ngân hàng khác, tiền mặt | Nhập tay | Mọi giao dịch |

Mỗi ngân hàng có một bộ đọc trong `src/lib/email/providers/`. Muốn thêm ngân hàng mới thì viết thêm một provider rồi đăng ký trong `providers/index.ts`.

### Cấu hình đọc email (Gmail)

1. Bật Xác minh 2 bước, rồi tạo **Mật khẩu ứng dụng** tại myaccount.google.com/apppasswords.
2. Điền `IMAP_USER` và `IMAP_PASSWORD` vào `.env`, rồi khởi động lại server.
   - Web tự đọc thư mỗi `EMAIL_POLL_MINUTES` phút. Lần đầu đọc 30 ngày gần nhất.
   - Chỉ đọc thư từ người gửi có chứa `VCB_EMAIL_FROM`, `CAKE_EMAIL_FROM` hoặc `ACB_EMAIL_FROM`.
3. Muốn thử trước khi cấu hình: vào trang **Tài khoản**, dán nội dung một email vào ô "Dán nội dung một email".

Cách xử lý:
- Chống trùng theo mã giao dịch của ngân hàng. Phí giao dịch được ghi thành một khoản chi riêng.
- Bên kia trùng tên bạn, hoặc tài khoản bên kia là tài khoản đã có trong web, thì coi là chuyển nội bộ và không tính vào thu chi. Nên thêm trước các tài khoản khác của bạn (ví dụ VietinBank) ở trang Tài khoản.
- Email ACB không ghi giờ và mã giao dịch. Giờ lấy theo thời điểm gửi email; nếu dán tay (không có giờ gửi) thì lấy giờ hiện tại với email hôm nay, 12:00 với email ngày khác. Chống trùng bằng mã băm của tài khoản, ngày, số tiền, số dư và nội dung.
- Số dư ACB lấy theo email gần nhất, cộng các giao dịch phát sinh sau đó (ví dụ nhập tay). Email cũ đến muộn không ghi đè số dư mới hơn.
- Tài khoản Vietcombank chỉ có tiền ra, nên số dư hiển thị không phải số dư thật. Web có đánh dấu "Chưa đủ tiền vào" ở những tài khoản này.

Kiểm tra bộ đọc email: `npm run test:parser`.

## Tính năng

- **Tổng quan**
  - KPI thu, chi, chênh lệch, tỷ lệ tiết kiệm, mỗi số có so sánh với kỳ trước.
  - Tổng số dư các tài khoản.
  - Biểu đồ chi lũy kế so với kỳ trước và ngân sách, cơ cấu chi và thu theo danh mục, thu chi 12 tháng, chi trung bình theo thứ trong tuần.
  - Top 10 khoản chi, cảnh báo ngân sách.
- **Giao dịch**
  - Lọc theo ngày, tài khoản, thu/chi, danh mục, từ khóa; đổi danh mục ngay tại dòng.
  - Chọn nhiều để gán danh mục hoặc loại khỏi thống kê.
  - Tạo quy tắc từ một giao dịch, nhập tay giao dịch, xuất Excel theo bộ lọc.
- **Thống kê**
  - Thu chi theo tháng, so sánh cùng kỳ năm trước.
  - Ma trận danh mục × tháng, xu hướng từng danh mục.
  - Xuất Excel (3 sheet).
- **Ngân sách**: hạn mức mặc định hàng tháng hoặc riêng từng tháng, tiến độ chi so với tiến độ thời gian, sao chép từ tháng trước.
- **Danh mục & Quy tắc**
  - Quy tắc theo từ khóa (khớp nguyên từ, không phân biệt dấu) hoặc regex, có độ ưu tiên.
  - Ô thử quy tắc, nút áp dụng lại cho giao dịch cũ. Giao dịch bạn đã tự phân loại không bao giờ bị ghi đè.
- **Tự nhận diện chuyển khoản nội bộ**
  - Một khoản ra và một khoản vào cùng số tiền, ở hai tài khoản khác nhau, cách nhau tối đa 15 phút sẽ được ghép cặp và loại khỏi thống kê. Áp dụng cả với rút ATM rồi nhập tay khoản thu vào ví tiền mặt.
  - Gỡ cặp bằng nút "Không phải chuyển nội bộ" trong chi tiết giao dịch. Cặp đã gỡ sẽ không tự ghép lại.
  - Có nút quét lại toàn bộ giao dịch ở trang Tài khoản. Muốn đổi khoảng thời gian thì sửa `TRANSFER_WINDOW_MINUTES` trong `src/lib/transfers.ts`.
- **Tài khoản**
  - Tài khoản ngân hàng được tạo tự động từ email đầu tiên. Có thể thêm tay tài khoản ngân hàng khác và ví tiền mặt.

## Ghi chú kỹ thuật

- Giờ trong email ngân hàng là giờ Việt Nam. DB lưu UTC, mọi thống kê được gom nhóm theo UTC+7.
- Nguồn giao dịch: `EMAIL` (đọc email), `MANUAL` (nhập tay), `IMPORT` (dữ liệu nhập sẵn, ví dụ dữ liệu demo).
- Giao dịch *loại khỏi thống kê* (chuyển nội bộ, hoặc do bạn tự đánh dấu) không được tính vào thu chi, nhưng vẫn được tính vào số dư tài khoản.
- Tiền lưu dạng `BIGINT` (đồng), JSON trả về dạng number.
