import { normalizeText } from '@/lib/text';

// Gợi ý từ khóa: bỏ các từ chung chung của nội dung chuyển khoản, lấy 2 từ có nghĩa đầu tiên
const STOP = new Set(['CK', 'CHUYEN', 'TIEN', 'DEN', 'TU', 'THANH', 'TOAN', 'CHO', 'NOI', 'DUNG', 'GD', 'MBVCB', 'IBFT', 'FT', 'TRANSFER', 'QR', 'DON', 'HANG']);

export function suggestKeyword(content: string): string {
  const words = normalizeText(content)
    .split(/[^A-Z0-9.!&-]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w));
  return words.slice(0, 2).join(' ');
}
