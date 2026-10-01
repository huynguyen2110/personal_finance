import { apiRequest } from './api-client';

// Tải file từ API (VD Excel) kèm token: lấy blob, đọc tên file từ Content-Disposition rồi bấm link ảo.
export async function downloadFile(url: string, params?: Record<string, unknown>, fallbackName = 'tai-ve.xlsx') {
  const { data, headers } = await apiRequest<Blob>({ url, params, responseType: 'blob' });
  const cd = headers['content-disposition'] ?? '';
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = cd.match(/filename="?([^";]+)"?/i)?.[1];
  const filename = star ? decodeURIComponent(star) : (plain ?? fallbackName);

  const href = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
