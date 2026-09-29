import { normalizeText } from '../text';

// Công cụ chung để đọc email thông báo của ngân hàng.
// Email được chuyển thành danh sách "ô chữ" (token): mỗi ô bảng / dòng là một token.
// Dạng "Nhãn → Giá trị" nằm cạnh nhau nên dùng được cho cả HTML lẫn nội dung copy/dán.

export function norm(s: string): string {
  return normalizeText(s.replace(/[’‘`]/g, "'")).replace(/\s*:\s*$/, '');
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToTokens(html: string): string[] {
  const text = html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|td|th|tr|li|h[1-6]|table|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return textToTokens(decodeEntities(text));
}

// Văn bản thuần (VD: copy từ trình đọc mail) → ô chữ: tách theo dòng và tab
export function textToTokens(text: string): string[] {
  return text
    .split(/[\r\n\t]+/)
    .map((t) => t.replace(/[ \s]+/g, ' ').trim())
    .filter(Boolean);
}

export function toTokens(input: { html?: string | null; text?: string | null }): string[][] {
  const out: string[][] = [];
  if (input.html) out.push(htmlToTokens(input.html));
  if (input.text) out.push(textToTokens(input.text));
  return out;
}

const MONEY_RE = /^([+\-−])?\s*([\d.,]+)\s*(VND|VNĐ|đ|₫)?$/i;

// "1,250,000 VND" / "-65.000 đ" / "+1.000.000₫" → { value, sign }
export function parseMoney(s: string): { value: number; sign: 1 | -1 | 0 } | null {
  const m = s.trim().match(MONEY_RE);
  if (!m) return null;
  // Bỏ phần thập phân kiểu "1,000.00" / "1.000,00", còn lại bỏ hết dấu phân cách hàng nghìn
  const digits = m[2].replace(/[.,]\d{1,2}$/, '').replace(/[.,]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  const sign = m[1] === '+' ? 1 : m[1] === '-' || m[1] === '−' ? -1 : 0;
  return { value, sign };
}

// "13:48 Thứ Ba 29/09/2026" / "25/09/2026, 20:29:05" → Date (giờ Việt Nam)
export function parseVNDate(s: string): Date | null {
  const d = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const t = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!d) return null;
  const pad = (x: string | number) => String(x).padStart(2, '0');
  const [hh, mm, ss] = t ? [t[1], t[2], t[3] ?? '00'] : ['00', '00', '00'];
  const date = new Date(`${d[3]}-${pad(d[2])}-${pad(d[1])}T${pad(hh)}:${pad(mm)}:${pad(ss)}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const digitsOnly = (s: string | null | undefined) => (s ? s.replace(/\D/g, '') : '');

// Bộ đọc nhãn → giá trị cho một mẫu email (mỗi ngân hàng một bộ nhãn)
export function labelReader(tokens: string[], allLabels: readonly string[]) {
  const labelSet = new Set(allLabels);
  const isLabel = (t: string) => labelSet.has(norm(t));

  const indexOf = (labels: readonly string[], from = 0) => {
    for (let i = from; i < tokens.length; i++) if (labels.includes(norm(tokens[i]))) return i;
    return -1;
  };

  return {
    isLabel,
    has: (labels: readonly string[]) => indexOf(labels) >= 0,
    // Giá trị = ô đầu tiên sau nhãn mà không phải là một nhãn khác
    value(labels: readonly string[]): string | null {
      const i = indexOf(labels);
      if (i < 0) return null;
      for (let j = i + 1; j < Math.min(tokens.length, i + 4); j++) {
        if (!isLabel(tokens[j])) return tokens[j].trim();
      }
      return null;
    },
    // Số tiền = ô dạng tiền đầu tiên trong vài ô sau nhãn (bảng phí có nhãn con xen giữa)
    money(labels: readonly string[], window = 8) {
      const i = indexOf(labels);
      if (i < 0) return null;
      for (let j = i + 1; j < Math.min(tokens.length, i + 1 + window); j++) {
        const v = parseMoney(tokens[j]);
        if (v) return v;
      }
      return null;
    },
  };
}
