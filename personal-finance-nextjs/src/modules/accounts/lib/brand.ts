// Nhận diện thương hiệu ngân hàng từ tên: chữ viết tắt + màu đại diện (dùng cho avatar, chấm màu)
export interface BankBrand {
  short: string;
  color: string;
}

const BRANDS: { match: RegExp; short: string; color: string }[] = [
  { match: /vietcombank|\bvcb\b/i, short: 'VCB', color: '#004e38' },
  { match: /cake/i, short: 'Cake', color: '#db2777' },
  { match: /\bacb\b|á châu|a chau/i, short: 'ACB', color: '#0369a1' },
  { match: /vietinbank|\bctg\b/i, short: 'VTB', color: '#1d4ed8' },
  { match: /techcombank|\btcb\b/i, short: 'TCB', color: '#dc2626' },
  { match: /\bmb\b|mbbank|quân đội/i, short: 'MB', color: '#1e3a8a' },
  { match: /tpbank|tiên phong/i, short: 'TPB', color: '#7c3aed' },
  { match: /bidv/i, short: 'BIDV', color: '#0e7490' },
  { match: /agribank/i, short: 'AGR', color: '#b45309' },
  { match: /vpbank/i, short: 'VPB', color: '#15803d' },
  { match: /sacombank|\bstb\b/i, short: 'STB', color: '#1e40af' },
  { match: /momo/i, short: 'MoMo', color: '#be185d' },
  { match: /zalopay/i, short: 'ZLP', color: '#0284c7' },
];

export function bankBrand(name: string | null | undefined): BankBrand {
  const n = (name ?? '').trim();
  const hit = BRANDS.find((b) => b.match.test(n));
  if (hit) return hit;
  // Không biết ngân hàng: lấy chữ cái đầu của tối đa 3 từ
  const short =
    n
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'NH';
  return { short, color: '#475569' };
}
