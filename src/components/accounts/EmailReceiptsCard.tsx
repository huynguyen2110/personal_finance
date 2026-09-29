'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CircleAlert, CircleCheck, ClipboardPaste, Mail, RefreshCw } from 'lucide-react';
import { api } from '@/lib/client';
import { formatVND } from '@/lib/money';
import { formatVNDateTime } from '@/lib/dates';

interface Summary {
  at: string;
  scanned: number;
  created: number;
  merged: number;
  duplicates: number;
  skipped: number;
  error?: string;
}

interface Provider {
  id: string;
  bankName: string;
  description: string;
  covers: { in: boolean; out: boolean };
  reportsBalance: boolean;
  from: string;
}

interface Status {
  configured: boolean;
  pollMinutes: number;
  lastRun: Summary | null;
  providers: Provider[];
}

interface Preview {
  bankName: string;
  referenceCode: string;
  transactionDate: string;
  accountTail: string;
  direction: 'IN' | 'OUT';
  amount: number;
  fee: number;
  content: string;
  selfTransfer: boolean;
  balanceAfter: number | null;
}

const RESULT_LABEL = {
  created: 'Đã thêm giao dịch mới',
  merged: 'Đã gộp với giao dịch có sẵn',
  duplicate: 'Giao dịch này đã được ghi nhận trước đó',
} as const;

// Đọc email thông báo giao dịch của ngân hàng: tự động qua IMAP, hoặc dán tay một email.
export default function EmailReceiptsCard({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [polling, setPolling] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = () => api<Status>('/api/email/status').then(setStatus).catch(() => {});
  useEffect(() => {
    loadStatus();
  }, []);

  async function poll(sinceDays?: number) {
    setPolling(true);
    try {
      const s = await api<Summary>('/api/email/poll', { method: 'POST', body: JSON.stringify(sinceDays ? { sinceDays } : {}) });
      toast.success(
        `Đọc ${s.scanned} thư: ${s.created} giao dịch mới, ${s.merged} gộp, ${s.duplicates} đã có, ${s.skipped} không phải thông báo giao dịch`,
        { duration: 6000 }
      );
      loadStatus();
      onImported();
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 });
      loadStatus();
    } finally {
      setPolling(false);
    }
  }

  async function importPasted(dryRun: boolean) {
    setBusy(true);
    try {
      const r = await api<{ preview: Preview; result?: { status: keyof typeof RESULT_LABEL } }>('/api/email/import', {
        method: 'POST',
        body: JSON.stringify({ content: text, dryRun }),
      });
      setPreview(r.preview);
      if (r.result) {
        toast.success(RESULT_LABEL[r.result.status]);
        setText('');
        setPreview(null);
        onImported();
      }
    } catch (e) {
      setPreview(null);
      toast.error((e as Error).message, { duration: 6000 });
    } finally {
      setBusy(false);
    }
  }

  const last = status?.lastRun;

  return (
    <section className="glass-card p-4 md:p-5">
      <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-1">
        <Mail className="w-4 h-4 text-text-muted" /> Đọc email thông báo của ngân hàng
      </h2>
      <p className="text-xs text-text-muted mb-3">
        Web đọc hộp thư của bạn để ghi nhận giao dịch, không qua bên thứ ba. Mỗi ngân hàng có mẫu email riêng:
      </p>

      {status && (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          {status.providers.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-sm font-medium text-text">
                {p.bankName}{' '}
                <span className="text-xs font-normal text-text-muted">
                  · {p.covers.in && p.covers.out ? 'tiền vào & ra' : p.covers.out ? 'chỉ tiền ra' : 'chỉ tiền vào'}
                  {p.reportsBalance && ' · có số dư'}
                </span>
              </p>
              <p className="text-xs text-text-secondary">{p.description}</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Lọc người gửi chứa “{p.from}”
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tự động qua IMAP */}
        <div className="space-y-3">
          {status &&
            (status.configured ? (
              <p className="flex items-center gap-1.5 text-xs text-success">
                <CircleCheck className="w-4 h-4" aria-hidden />
                Đã cấu hình hộp thư
                {status.pollMinutes > 0 ? ` · tự đọc mỗi ${status.pollMinutes} phút` : ' · đang tắt tự đọc (EMAIL_POLL_MINUTES=0)'}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <CircleAlert className="w-4 h-4" aria-hidden /> Chưa cấu hình IMAP_USER / IMAP_PASSWORD
              </p>
            ))}

          {last && (
            <p className={`text-xs ${last.error ? 'text-danger' : 'text-text-secondary'}`}>
              Lần đọc gần nhất {formatVNDateTime(last.at)}:{' '}
              {last.error ? last.error : `${last.scanned} thư, ${last.created} mới, ${last.merged} gộp, ${last.skipped} bỏ qua`}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary !py-2 text-sm flex items-center gap-2 disabled:opacity-60"
              disabled={polling || !status?.configured}
              onClick={() => poll()}
            >
              <RefreshCw className={`w-4 h-4 ${polling ? 'animate-spin' : ''}`} /> Đọc email ngay
            </button>
            <button
              type="button"
              className="btn-secondary !py-2 text-sm disabled:opacity-60"
              disabled={polling || !status?.configured}
              onClick={() => poll(90)}
              title="Đọc lại toàn bộ thư 90 ngày gần nhất (giao dịch đã có sẽ tự bỏ qua)"
            >
              Đọc lại 90 ngày
            </button>
          </div>

          <details className="text-xs text-text-secondary">
            <summary className="cursor-pointer font-medium text-text">Cách cấu hình (Gmail)</summary>
            <ol className="list-decimal pl-5 mt-2 space-y-1.5">
              <li>Bật <b>Xác minh 2 bước</b> cho tài khoản Google nhận email ngân hàng.</li>
              <li>
                Tạo <b>Mật khẩu ứng dụng</b> tại <code className="bg-slate-100 px-1 rounded">myaccount.google.com/apppasswords</code> — không dùng mật khẩu Gmail thường.
              </li>
              <li>
                Mở file <code className="bg-slate-100 px-1 rounded">.env</code>, điền <code className="bg-slate-100 px-1 rounded">IMAP_USER</code> (địa chỉ Gmail) và{' '}
                <code className="bg-slate-100 px-1 rounded">IMAP_PASSWORD</code> (mật khẩu ứng dụng), rồi khởi động lại server.
              </li>
              <li>
                Nếu địa chỉ gửi của ngân hàng không chứa chuỗi lọc ở trên, sửa{' '}
                <code className="bg-slate-100 px-1 rounded">VCB_EMAIL_FROM</code> / <code className="bg-slate-100 px-1 rounded">CAKE_EMAIL_FROM</code> / <code className="bg-slate-100 px-1 rounded">ACB_EMAIL_FROM</code> cho khớp.
              </li>
              <li>Nên dùng hộp thư riêng (hoặc bộ lọc tự chuyển tiếp thư ngân hàng sang đó) để hạn chế quyền đọc thư khác.</li>
            </ol>
          </details>
        </div>

        {/* Dán tay */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
            <ClipboardPaste className="w-4 h-4" /> Hoặc dán nội dung một email
          </p>
          <textarea
            className="input-field font-mono !text-xs"
            rows={6}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            placeholder="Mở email thông báo (Vietcombank / Cake / ACB), chọn toàn bộ nội dung (Ctrl+A) → Copy → dán vào đây. Hoặc dán mã HTML gốc của thư."
            aria-label="Nội dung email"
          />
          {preview && (
            <div className="rounded-xl bg-surface-light px-3 py-2 text-xs space-y-0.5">
              <p className="text-text">
                <span className="text-text-secondary">{preview.bankName} ••{preview.accountTail} · </span>
                <b className={`tabular ${preview.direction === 'IN' ? 'text-[#1d4ed8]' : ''}`}>
                  {preview.direction === 'IN' ? '+' : '−'}
                  {formatVND(preview.amount)}
                </b>
                {preview.fee > 0 && <span className="text-text-muted"> (+ phí {formatVND(preview.fee)})</span>} ·{' '}
                {formatVNDateTime(preview.transactionDate)}
              </p>
              <p className="text-text-secondary break-words">{preview.content}</p>
              <p className="text-text-muted">
                Mã {preview.referenceCode}
                {preview.balanceAfter !== null && ` · số dư sau giao dịch ${formatVND(preview.balanceAfter)}`}
              </p>
              {preview.selfTransfer && (
                <p className="text-text-secondary">↔ Bên kia trùng tên bạn → coi là chuyển nội bộ, không tính vào thu chi</p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary !py-2 text-sm disabled:opacity-60"
              disabled={busy || text.trim().length < 20}
              onClick={() => importPasted(true)}
            >
              Đọc thử
            </button>
            <button
              type="button"
              className="btn-primary !py-2 text-sm disabled:opacity-60"
              disabled={busy || !preview}
              onClick={() => importPasted(false)}
            >
              Lưu giao dịch
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
