'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/shared/Modal';
import { errorMessage } from '@/lib/api-client';
import { changePassword } from '../lib';

const MIN_LENGTH = 8;

// Đổi mật khẩu (menu tài khoản). Thành công → các thiết bị khác phải đăng nhập lại.
export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < MIN_LENGTH) return setError(`Mật khẩu mới cần ít nhất ${MIN_LENGTH} ký tự`);
    if (next !== confirm) return setError('Mật khẩu nhập lại không khớp');
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast.success('Đã đổi mật khẩu. Các thiết bị khác sẽ phải đăng nhập lại.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Đổi mật khẩu" size="sm">
      <form onSubmit={submit} className="flex flex-col gap-4 font-jakarta">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-900">
          Mật khẩu hiện tại
          <input type="password" className="input-field" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required autoFocus />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-900">
          Mật khẩu mới <span className="text-xs font-normal text-slate-500">Tối thiểu {MIN_LENGTH} ký tự</span>
          <input type="password" className="input-field" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-900">
          Nhập lại mật khẩu mới
          <input type="password" className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="fin-btn fin-btn-outline" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="fin-btn fin-btn-primary" disabled={saving}>
            {saving ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
