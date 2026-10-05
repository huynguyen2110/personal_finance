import { formatCompactVND, formatVND } from '@/lib/money';
import { PropertyDefinition } from './api';

const numberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
});

/** Số theo đơn vị của thuộc tính: tiền → "1,5 tr" (compact) / "1.500.000 ₫", giờ → "10 giờ". */
export function formatPropertyNumber(
  unit: PropertyDefinition['unit'],
  value: number,
  compact = false,
): string {
  if (unit === 'money') return compact ? `${formatCompactVND(value)}₫` : formatVND(value);
  if (unit === 'hours') return `${numberFormatter.format(value)} giờ`;
  return numberFormatter.format(value);
}
