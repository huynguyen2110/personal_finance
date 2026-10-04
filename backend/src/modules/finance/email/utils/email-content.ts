import { norm } from './tokens';
import type { ParsedBankEmail } from '../types';

// Người bên kia trùng tên chủ tài khoản → gần như chắc chắn chuyển giữa các tài khoản của chính mình
export function isSelfTransfer(p: ParsedBankEmail): boolean {
  return !!p.ownerName && !!p.counterpartyName && norm(p.ownerName) === norm(p.counterpartyName);
}

// Nội dung lưu vào giao dịch: nội dung CK + bên kia + ngân hàng (giúp quy tắc phân loại khớp tên cửa hàng)
export function emailContent(p: ParsedBankEmail): string {
  const parts = [p.details || p.kind || (p.direction === 'OUT' ? 'Chuyển tiền' : 'Nhận tiền')];
  if (p.counterpartyName) parts.push(`${p.direction === 'OUT' ? '→' : '←'} ${p.counterpartyName}`);
  if (p.counterpartyBank) parts.push(`(${p.counterpartyBank})`);
  return parts.join(' ');
}
