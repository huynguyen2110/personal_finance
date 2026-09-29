'use client';

import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4
          ${variant === 'danger' ? 'bg-danger/20' : 'bg-warning/20'}`}>
          <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-danger' : 'text-warning'}`} />
        </div>
        <p className="text-text-secondary mb-6">{message}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1">{cancelText}</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-5 py-2.5 font-medium rounded-xl transition-all duration-300 cursor-pointer
              ${variant === 'danger'
                ? 'bg-danger text-white hover:bg-danger/80'
                : 'bg-warning text-surface-dark hover:bg-warning/80'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
