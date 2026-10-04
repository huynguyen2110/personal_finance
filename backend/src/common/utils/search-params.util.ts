// Chuyển object query (đã qua DTO) về URLSearchParams để dùng chung các hàm lọc sẵn có
export function toSearchParams(query: object): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  return sp;
}
