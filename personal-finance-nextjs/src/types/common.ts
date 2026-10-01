// Kiểu dùng chung. DTO từ API: tiền là number (đồng), ngày là chuỗi ISO.
export type Direction = 'IN' | 'OUT';
export type CategoryKind = 'EXPENSE' | 'INCOME';

// Danh sách phân trang kèm tổng thu/chi theo bộ lọc
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  sumIn: number;
  sumOut: number;
}
