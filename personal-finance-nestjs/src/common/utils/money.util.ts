// Tiền VND: DB lưu BigInt, client dùng number (an toàn tới ~9 triệu tỷ).

const vndFormatter = new Intl.NumberFormat('vi-VN');

export function formatVND(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${vndFormatter.format(n)} ₫`;
}

// Dạng rút gọn cho trục biểu đồ: 1,2 tr / 350 k / 2,5 tỷ
export function formatCompactVND(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const fmt = (v: number) =>
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(v);
  if (abs >= 1e9) return `${sign}${fmt(abs / 1e9)} tỷ`;
  if (abs >= 1e6) return `${sign}${fmt(abs / 1e6)} tr`;
  if (abs >= 1e3) return `${sign}${fmt(abs / 1e3)} k`;
  return `${sign}${fmt(abs)}`;
}

// Chuyển giá trị tiền bất kỳ (number/string "2277000.00"/bigint) sang BigInt đồng.
export function toBigIntAmount(v: unknown): bigint {
  if (typeof v === 'bigint') return v;
  const n = typeof v === 'number' ? v : Number(String(v ?? '0').replace(/,/g, ''));
  if (!Number.isFinite(n)) return BigInt(0);
  return BigInt(Math.round(n));
}
