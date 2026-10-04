# Chi tiêu cá nhân

Web theo dõi thu chi cá nhân. Giao dịch ngân hàng được ghi nhận bằng cách **đọc email thông báo của ngân hàng** (không qua bên thứ ba), tự phân loại theo quy tắc, có ngân sách, thống kê và xuất Excel.

Gồm hai phần trong cùng repo:

| Thư mục | Vai trò | Stack | Cổng |
|---|---|---|---|
| `personal-finance-nestjs/` | API (BE) | NestJS 11, Prisma 5, PostgreSQL (Laragon hoặc Neon), JWT, ExcelJS, imapflow + mailparser | 4000 |
| `personal-finance-nextjs/` | Giao diện (FE) | Next.js 16, React Query, axios, Tailwind 4, Recharts | dev 3003, prod 3002 |

## Cấu trúc

```
personal-finance-nestjs/
  prisma/                schema, migrations, seed.ts, seed-demo.ts
  src/common/            guard JWT, @Public(), interceptor envelope, filter lỗi, pipe validate, utils
  src/database/          PrismaService
  src/modules/<tên>/     <tên>.module.ts, controllers/, services/, dto/, utils/
                         auth, accounts, categories, rules, transfers, transactions, stats, budgets, reports, email
  test/                  e2e (supertest, dùng user tạm, không ghi dữ liệu tài chính)
personal-finance-nextjs/
  src/app/               route mỏng, chỉ render component của module
  src/modules/<tên>/     components/, lib/ (query key + hook React Query + hàm gọi API), types/
  src/lib/               api-client (Bearer + tự refresh token), auth-storage, download, query-client, dates, money…
  src/components/        layout, shared, charts
```

- API trả về `{ statusCode, timestamp, duration, data }`; lỗi trả `{ statusCode, message, error, path, timestamp }`.
- Đăng nhập: `POST /api/auth/login` trả access token (15 phút) + refresh token (30 ngày, xoay vòng mỗi lần `POST /api/auth/refresh-token`). FE lưu token trong localStorage và tự refresh.
- Tài liệu API (Swagger): http://localhost:4000/api-docs

## Chạy lần đầu

Tạo DB `personal_finance` trong PostgreSQL trước (Laragon mặc định user `postgres`/`postgres`):

```bash
psql -U postgres -c "CREATE DATABASE personal_finance;"
```

```bash
cd personal-finance-nestjs
npm install
cp .env.example .env        # điền JWT_SECRET, ADMIN_PASSWORD, IMAP_USER, IMAP_PASSWORD...
npm run prisma:deploy       # tạo bảng
npm run seed                # tài khoản đăng nhập, danh mục mặc định, quy tắc mẫu, ví tiền mặt
npm run seed:demo           # (tùy chọn) ~6 tháng giao dịch giả để xem thống kê
npm run seed:goals          # (tùy chọn) mục tiêu tiết kiệm mẫu; xóa: npm run seed:goals -- --clear
npm run build && npm run start:prod   # API ở http://localhost:4000
```

```bash
cd personal-finance-nextjs
npm install
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run build && npm start  # web ở http://localhost:3002
```

Khi phát triển: `npm run start:dev` (BE) và `npm run dev` (FE, cổng 3003).

Kiểm tra BE: `npm test` (unit, gồm bộ đọc email) và `npm run test:e2e` (cần PostgreSQL đang chạy).

Đọc email theo lịch từ Task Scheduler (tùy chọn): gọi `http://localhost:4000/api/cron/sync?secret=<CRON_SECRET>`.

Giữ API trên Render không ngủ (gói free ngủ sau 15 phút không có request): đặt cron ngoài (VD cron-job.org, UptimeRobot) gọi `GET https://<api>.onrender.com/api/health` mỗi 10–14 phút. Route không cần đăng nhập, không truy vấn DB (để Neon vẫn tự ngủ, không tốn giờ compute).

## Mỗi ngân hàng một cách ghi nhận

| Ngân hàng | Cách ghi nhận | Ghi nhận được |
|---|---|---|
| **Vietcombank** | Email "Biên lai chuyển tiền" | Chỉ tiền **ra** do bạn tự chuyển từ VCB Digibank |
| **Cake** | Email "Cake xin thông báo … vừa mới phát sinh giao dịch" | Tiền **ra và vào** (số tiền có dấu −/+) |
| **ACB** | Email từ mailalert@acb.com.vn "… đã thay đổi số dư" | Tiền **ra và vào** (Ghi nợ/Ghi có), **kèm số dư mới** |
| Ngân hàng khác, tiền mặt | Nhập tay | Mọi giao dịch |

Mỗi ngân hàng có một bộ đọc trong `personal-finance-nestjs/src/modules/email/providers/`. Muốn thêm ngân hàng mới thì viết thêm một provider rồi đăng ký trong `providers/index.ts`.

### Cấu hình đọc email (Gmail)

1. Bật Xác minh 2 bước, rồi tạo **Mật khẩu ứng dụng** tại myaccount.google.com/apppasswords.
2. Điền `IMAP_USER` và `IMAP_PASSWORD` vào `personal-finance-nestjs/.env`, rồi khởi động lại API.
   - Web tự đọc thư mỗi `EMAIL_POLL_MINUTES` phút. Lần đầu đọc 30 ngày gần nhất.
   - Chỉ đọc thư từ người gửi có chứa `VCB_EMAIL_FROM`, `CAKE_EMAIL_FROM` hoặc `ACB_EMAIL_FROM`.
3. Muốn thử trước khi cấu hình: vào trang **Tài khoản**, dán nội dung một email vào ô "Dán nội dung một email".

Cách xử lý:
- Chống trùng theo mã giao dịch của ngân hàng. Phí giao dịch được ghi thành một khoản chi riêng.
- Bên kia trùng tên bạn, hoặc tài khoản bên kia là tài khoản đã có trong web, thì coi là chuyển nội bộ và không tính vào thu chi. Nên thêm trước các tài khoản khác của bạn (ví dụ VietinBank) ở trang Tài khoản.
- Email ACB không ghi giờ và mã giao dịch. Giờ lấy theo thời điểm gửi email; nếu dán tay (không có giờ gửi) thì lấy giờ hiện tại với email hôm nay, 12:00 với email ngày khác. Chống trùng bằng mã băm của tài khoản, ngày, số tiền, số dư và nội dung.
- Số dư ACB lấy theo email gần nhất, cộng các giao dịch phát sinh sau đó (ví dụ nhập tay). Email cũ đến muộn không ghi đè số dư mới hơn.
- Tài khoản Vietcombank chỉ có tiền ra, nên số dư hiển thị không phải số dư thật. Web có đánh dấu "Chưa đủ tiền vào" ở những tài khoản này.

Kiểm tra bộ đọc email: `npm test -- providers` trong `personal-finance-nestjs`.

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
- **Mục tiêu tiết kiệm**
  - Mỗi mục tiêu là một "hũ": số tiền cần đạt, thời hạn, mức ưu tiên, nơi giữ tiền và lãi suất. Web chỉ ghi lại các lần nạp/rút/nhận lãi, không chuyển tiền thật.
  - Tự tính số cần nạp mỗi tháng để kịp hạn, dự kiến tháng đạt (có tính lãi nhập gốc hàng tháng), trạng thái đúng lộ trình / chậm / quá hạn.
  - Kế hoạch nạp định kỳ (số tiền + ngày trong tháng): nhắc khi tới ngày mà tháng đó chưa nạp đủ; huy hiệu "kỷ luật tài chính" so thực nạp với kế hoạch 3 tháng gần nhất.
  - Quỹ khẩn cấp: gợi ý số tiền bằng 6 tháng chi tiêu thực tế, vạch mốc an toàn 3 tháng, hiển thị số tháng chi tiêu đã đủ.
  - Gợi ý trích thặng dư tháng này (thu − chi − đã nạp) để về đích mục tiêu ưu tiên nhất.
  - Ghi **chi tiêu từ quỹ** khi đã dùng tiền cho đúng mục đích: không làm giảm tiến độ (quỹ đã đạt vẫn là hoàn thành), chỉ giảm số còn trong quỹ. Lọc quỹ **chưa tiêu / đã tiêu** (gồm tiêu một phần), xem tổng còn trong quỹ và đã tiêu.
  - Lần nạp/rút có thể gắn với giao dịch chuyển tiền đã ghi nhận và loại giao dịch đó khỏi thống kê chi tiêu; xóa lần nạp thì giao dịch được tính lại.
- **Danh mục & Quy tắc**
  - Quy tắc theo từ khóa (khớp nguyên từ, không phân biệt dấu) hoặc regex, có độ ưu tiên.
  - Ô thử quy tắc, nút áp dụng lại cho giao dịch cũ. Giao dịch bạn đã tự phân loại không bao giờ bị ghi đè.
- **Tự nhận diện chuyển khoản nội bộ**
  - Một khoản ra và một khoản vào cùng số tiền, ở hai tài khoản khác nhau, cách nhau tối đa 15 phút sẽ được ghép cặp và loại khỏi thống kê. Áp dụng cả với rút ATM rồi nhập tay khoản thu vào ví tiền mặt.
  - Gỡ cặp bằng nút "Không phải chuyển nội bộ" trong chi tiết giao dịch. Cặp đã gỡ sẽ không tự ghép lại.
  - Có nút quét lại toàn bộ giao dịch ở trang Tài khoản. Muốn đổi khoảng thời gian thì sửa `TRANSFER_WINDOW_MINUTES` trong `personal-finance-nestjs/src/modules/transfers/services/transfers.service.ts`.
- **Tài khoản**
  - Tài khoản ngân hàng được tạo tự động từ email đầu tiên. Có thể thêm tay tài khoản ngân hàng khác và ví tiền mặt.

## Ghi chú kỹ thuật

- Giờ trong email ngân hàng là giờ Việt Nam. DB lưu UTC, mọi thống kê được gom nhóm theo UTC+7.
- Nguồn giao dịch: `EMAIL` (đọc email), `MANUAL` (nhập tay), `IMPORT` (dữ liệu nhập sẵn, ví dụ dữ liệu demo).
- Giao dịch *loại khỏi thống kê* (chuyển nội bộ, hoặc do bạn tự đánh dấu) không được tính vào thu chi, nhưng vẫn được tính vào số dư tài khoản.
- Tiền lưu dạng `BIGINT` (đồng), JSON trả về dạng number.
