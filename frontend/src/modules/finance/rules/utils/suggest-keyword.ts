import { normalizeText } from '@/lib/text';

// Gợi ý từ khóa từ nội dung chuyển khoản.
// Ưu tiên tên đối tác (phần sau mũi tên → / ←, bỏ tên ngân hàng trong ngoặc); không có thì lấy 2 từ có nghĩa đầu tiên.
// Bỏ các từ chung chung và các mã giao dịch (chuỗi có lẫn chữ số như MBTSW250332470, 6272ICBVC2FIGKDE).
const STOP = new Set([
  'CK', 'CHUYEN', 'TIEN', 'DEN', 'TU', 'THANH', 'TOAN', 'CHO', 'NOI', 'DUNG', 'GD', 'MBVCB', 'IBFT', 'FT', 'TRANSFER', 'QR', 'DON', 'HANG',
  'NGAN', 'TMCP', 'BANK', 'VN', 'VND', 'CONG', 'TY', 'CO', 'PHAN', 'TNHH',
]);

const isCode = (w: string) => /\d/.test(w) && /[A-Z]/.test(w);

function meaningfulWords(s: string): string[] {
  return normalizeText(s)
    .split(/[^A-Z0-9.!&-]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w) && !isCode(w));
}

export function suggestKeyword(content: string): string {
  const arrow = content.match(/[→←]\s*([^()]+)/);
  if (arrow) {
    const party = meaningfulWords(arrow[1]).slice(0, 3);
    if (party.length) return party.join(' ');
  }
  return meaningfulWords(content).slice(0, 2).join(' ');
}
