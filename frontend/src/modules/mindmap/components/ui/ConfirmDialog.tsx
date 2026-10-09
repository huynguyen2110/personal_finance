'use client';

import { Button } from './Button';
import { Dialog } from './Dialog';

/** Hộp xác nhận chung: nội dung + nút Hủy / nút xác nhận (đỏ khi là thao tác nguy hiểm). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div className="text-sm leading-relaxed text-gray-600">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
