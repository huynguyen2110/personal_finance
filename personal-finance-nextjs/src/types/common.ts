// Kiểu dùng chung. DTO từ API: tiền là number (đồng), ngày là chuỗi ISO.
export type Direction = 'IN' | 'OUT';
export type CategoryKind = 'EXPENSE' | 'INCOME';

// Danh sách phân trang kèm tổng thu/chi theo bộ lọc.
// sumIn/sumOut/statsCount/statsUncategorized chỉ tính giao dịch trong thống kê (bỏ khoản loại khỏi thống kê).
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  sumIn: number;
  sumOut: number;
  statsCount: number; // số giao dịch trong thống kê
  statsUncategorized: number; // trong đó chưa có danh mục
}
