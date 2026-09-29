import { emailPollMinutes, isEmailConfigured, pollBankEmails } from './imap';

// Tự đọc email thông báo ngân hàng định kỳ trong tiến trình server (npm start / npm run dev).
// EMAIL_POLL_MINUTES=0 để tắt (khi đó dùng nút "Đọc email ngay" hoặc /api/cron/sync).
const g = globalThis as unknown as { __emailPoller?: NodeJS.Timeout };

export function startEmailPoller() {
  const minutes = emailPollMinutes();
  if (!isEmailConfigured() || minutes <= 0 || g.__emailPoller) return;

  const tick = () =>
    pollBankEmails()
      .then((s) => {
        if (s.error) console.error('[email] đọc email lỗi:', s.error);
        else if (s.created || s.merged) console.log(`[email] +${s.created} giao dịch mới, ${s.merged} gộp với giao dịch có sẵn`);
      })
      .catch((e) => console.error('[email] đọc email lỗi:', e));

  g.__emailPoller = setInterval(tick, minutes * 60 * 1000);
  g.__emailPoller.unref?.();
  setTimeout(tick, 15_000); // lần đầu sau khi server đã sẵn sàng
  console.log(`[email] tự đọc email ngân hàng mỗi ${minutes} phút`);
}
