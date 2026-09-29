// Bỏ dấu tiếng Việt, viết hoa, gộp khoảng trắng. Dùng được cả ở client lẫn server.
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}
