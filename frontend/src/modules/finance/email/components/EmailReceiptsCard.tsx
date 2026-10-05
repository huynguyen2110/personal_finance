'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CircleAlert, CircleCheck, ClipboardPaste, HelpCircle, MailCheck } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { formatVND } from '@/lib/money';
import { formatVNDateTime } from '@/lib/dates';
import { bankBrand } from '@/modules/finance/accounts/lib/brand';
import { EMAIL_QUERY_KEYS, importEmail, pollEmails, useEmailStatus } from '../lib';
import type { EmailPreview } from '../types';

const RESULT_LABEL = {
  created: 'Đã thêm giao dịch mới',
  merged: 'Đã gộp với giao dịch có sẵn',
  duplicate: 'Giao dịch này đã được ghi nhận trước đó',
} as const;

// Đọc email thông báo giao dịch của ngân hàng: tự động qua IMAP, hoặc dán tay một email.
export default function EmailReceiptsCard({ onImported }: { onImported: () => void }) {
  const qc = useQueryClient();
  const { data: status } = useEmailStatus();
  const [polling, setPolling] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const loadStatus = () => qc.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.STATUS });

  async function poll(sinceDays?: number) {
    setPolling(true);
    try {
      const s = await pollEmails(sinceDays);
      toast.success(
        `Đọc ${s.scanned} thư: ${s.created} giao dịch mới, ${s.merged} gộp, ${s.duplicates} đã có, ${s.skipped} không phải thông báo giao dịch${s.ignoredIncoming ? `, bỏ qua ${s.ignoredIncoming} tiền đến` : ''}`,
        { duration: 6000 }
      );
      loadStatus();
      onImported();
    } catch (e) {
      toast.error(errorMessage(e), { duration: 8000 });
      loadStatus();
    } finally {
      setPolling(false);
    }
  }

  async function importPasted(dryRun: boolean) {
    setBusy(true);
    try {
      const r = await importEmail(text, dryRun);
      setPreview(r.preview);
      if (r.result) {
        toast.success(RESULT_LABEL[r.result.status]);
        setText('');
        setPreview(null);
        onImported();
      }
    } catch (e) {
      setPreview(null);
      toast.error(errorMessage(e), { duration: 6000 });
    } finally {
      setBusy(false);
    }
  }

  const last = status?.lastRun;
  const canPoll = !polling && !!status?.configured;

  return (
    <section className="fin-card p-4 md:p-6 flex flex-col gap-5">
      {/* Tiêu đề + nút đọc */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <h2 className="text-[16px] leading-6 font-semibold text-slate-900">Đọc email ngân hàng</h2>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" className="fin-btn fin-btn-primary" disabled={!canPoll} onClick={() => poll()}>
            <MailCheck className={`w-4 h-4 ${polling ? 'animate-pulse' : ''}`} aria-hidden /> Đọc email ngay
          </button>
          <button
            type="button"
            className="fin-btn fin-btn-outline"
            disabled={!canPoll}
            onClick={() => poll(90)}
            title="Đọc lại toàn bộ thư 90 ngày gần nhất (giao dịch đã có sẽ tự bỏ qua)"
          >
            Đọc lại 90 ngày
          </button>
        </div>
      </div>

      {/* Dải trạng thái hộp thư */}
      {status && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          {status.configured ? (
            <span className="inline-flex items-center gap-1.5 text-slate-900">
              <CircleCheck className="w-4 h-4 text-emerald-600" aria-hidden />
              <span className="font-semibold">Hộp thư đã kết nối</span>
              <span className="text-slate-500">
                {status.pollMinutes > 0 ? `• tự đọc mỗi ${status.pollMinutes} phút` : '• đang tắt tự đọc (EMAIL_POLL_MINUTES=0)'}
                {!status.incoming && ' • chỉ lấy tiền đi'}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
              <CircleAlert className="w-4 h-4" aria-hidden /> Chưa cấu hình IMAP_USER / IMAP_PASSWORD
            </span>
          )}
          {last && (
            <span className={`fin-num ${last.error ? 'text-rose-600' : 'text-slate-500'}`}>
              Lần đọc gần nhất {formatVNDateTime(last.at)}:{' '}
              {last.error ? last.error : `${last.scanned} thư, ${last.created} mới, ${last.merged} gộp, ${last.skipped + (last.ignoredIncoming ?? 0)} bỏ qua`}
            </span>
          )}
        </div>
      )}

      {/* Mẫu email từng ngân hàng */}
      {status && status.providers.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {status.providers.map((p) => {
            const b = bankBrand(p.bankName);
            return (
              <li
                key={p.id}
                className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color }} aria-hidden />
                    {p.bankName}
                  </span>
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap ${
                      p.reportsBalance ? 'text-emerald-700' : p.covers.in && p.covers.out ? 'text-teal-700' : 'text-slate-500'
                    }`}
                  >
                    {p.reportsBalance ? 'Kèm số dư thực' : p.covers.in && p.covers.out ? 'Tiền vào & ra' : p.covers.out ? 'Chỉ tiền ra' : 'Chỉ tiền vào'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{p.description}</p>
                <div className="pt-2 flex items-center justify-between gap-2 fin-label normal-case tracking-normal font-medium">
                  <span className="shrink-0 whitespace-nowrap">Người gửi chứa:</span>
                  <span className="font-mono text-slate-900 truncate min-w-0" title={p.from}>
                    {p.from}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Dán tay một email */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <ClipboardPaste className="w-5 h-5 text-slate-400" aria-hidden /> Thử nghiệm hoặc dán thủ công nội dung email
          </span>
          <span className="text-xs text-slate-500">Dán toàn văn hoặc HTML của email</span>
        </div>
        <textarea
          className="input-field font-mono !text-xs !rounded-lg resize-y"
          rows={4}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder="Mở email thông báo biến động (Vietcombank / Cake / ACB), chọn toàn bộ nội dung (Ctrl+A) → Copy → dán vào đây để kiểm tra trích xuất tức thì…"
          aria-label="Nội dung email"
        />
        {preview && (
          <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs space-y-1">
            <p className="text-slate-900">
              <span className="text-slate-500">
                {preview.bankName} ••{preview.accountTail} ·{' '}
              </span>
              <b className={`fin-num ${preview.direction === 'IN' ? 'text-income' : 'text-expense'}`}>
                {preview.direction === 'IN' ? '+' : '−'}
                {formatVND(preview.amount)}
              </b>
              {preview.fee > 0 && <span className="text-slate-500"> (+ phí {formatVND(preview.fee)})</span>} ·{' '}
              <span className="fin-num">{formatVNDateTime(preview.transactionDate)}</span>
            </p>
            <p className="text-slate-600 break-words">{preview.content}</p>
            <p className="text-slate-500 fin-num">
              Mã {preview.referenceCode}
              {preview.balanceAfter !== null && ` · số dư sau giao dịch ${formatVND(preview.balanceAfter)}`}
            </p>
            {preview.selfTransfer && (
              <p className="text-slate-600">↔ Bên kia trùng tên bạn → coi là chuyển nội bộ, không tính vào thu chi</p>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-teal-700 self-start"
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
          >
            <HelpCircle className="w-4 h-4 text-teal-700" aria-hidden />
            <span className="underline underline-offset-2">Xem hướng dẫn cấu hình hộp thư (Gmail)</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="fin-btn fin-btn-outline"
              disabled={busy || text.trim().length < 20}
              onClick={() => importPasted(true)}
            >
              Đọc thử (Dry Run)
            </button>
            <button type="button" className="fin-btn fin-btn-primary" disabled={busy || !preview} onClick={() => importPasted(false)}>
              Lưu thành giao dịch
            </button>
          </div>
        </div>

        {guideOpen && (
          <ol className="list-decimal pl-5 mt-1 space-y-1.5 text-xs text-slate-600 border-t border-slate-200 pt-3">
            <li>
              Bật <b>Xác minh 2 bước</b> cho tài khoản Google nhận email ngân hàng.
            </li>
            <li>
              Tạo <b>Mật khẩu ứng dụng</b> tại <code className="bg-white border border-slate-200 px-1 rounded">myaccount.google.com/apppasswords</code>{' '}
              — không dùng mật khẩu Gmail thường.
            </li>
            <li>
              Mở file <code className="bg-white border border-slate-200 px-1 rounded">.env</code>, điền{' '}
              <code className="bg-white border border-slate-200 px-1 rounded">IMAP_USER</code> (địa chỉ Gmail) và{' '}
              <code className="bg-white border border-slate-200 px-1 rounded">IMAP_PASSWORD</code> (mật khẩu ứng dụng), rồi khởi động lại
              server.
            </li>
            <li>
              Nếu địa chỉ gửi của ngân hàng không chứa chuỗi lọc ở trên, sửa{' '}
              <code className="bg-white border border-slate-200 px-1 rounded">VCB_EMAIL_FROM</code> /{' '}
              <code className="bg-white border border-slate-200 px-1 rounded">CAKE_EMAIL_FROM</code> /{' '}
              <code className="bg-white border border-slate-200 px-1 rounded">ACB_EMAIL_FROM</code> cho khớp.
            </li>
            <li>Nên dùng hộp thư riêng (hoặc bộ lọc tự chuyển tiếp thư ngân hàng sang đó) để hạn chế quyền đọc thư khác.</li>
          </ol>
        )}
      </div>
    </section>
  );
}
