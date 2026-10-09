// Cài đặt chung của ứng dụng (một người dùng)
export interface AppSettings {
  // Ngày bắt đầu "tháng" tài chính (VD ngày nhận lương). 1 = tháng lịch thông thường, tối đa 28.
  monthStartDay: number;
  // Chỉ lấy giao dịch từ email ngân hàng kể từ ngày này ("YYYY-MM-DD"); null = không giới hạn
  emailStartDate: string | null;
  // Có ghi nhận email báo tiền đến không; false = chỉ lấy email tiền đi (chi tiêu)
  emailIncoming: boolean;
  // Tài khoản của chính mình (ngân hàng khác) mà chuyển SANG vẫn luôn tính chi tiêu (VD quỹ phòng)
  alwaysSpendAccounts: { accountNumber: string; name: string | null; bank: string | null }[];
  // Do server tính kèm để hiển thị: hôm nay, tháng tài chính hiện tại và khoảng ngày của nó
  today: string;
  currentMonth: string;
  currentRange: { from: string; to: string };
}

export interface SettingsInput {
  monthStartDay?: number;
  emailStartDate?: string | null;
  emailIncoming?: boolean;
}
