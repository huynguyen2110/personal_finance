import { BadRequestException, Injectable } from '@nestjs/common';
import { DEFAULT_MONTH_START_DAY, isValidDateStr, MAX_MONTH_START_DAY, MIN_MONTH_START_DAY } from '../common/utils/dates.util';
import { AppStateService } from './app-state.service';

// Cài đặt chung của ứng dụng (một người dùng), lưu trong AppState dưới một khóa JSON
export interface AppSettings {
  // Ngày bắt đầu "tháng" tài chính (VD ngày nhận lương). 1 = tháng lịch thông thường.
  monthStartDay: number;
  // Chỉ lấy giao dịch từ email ngân hàng kể từ ngày này ("YYYY-MM-DD"); null = không giới hạn (30 ngày gần nhất ở lần đầu)
  emailStartDate: string | null;
  // Có ghi nhận email báo tiền ĐẾN không; false = chỉ lấy email tiền đi (chi tiêu)
  emailIncoming: boolean;
  // Tài khoản của chính mình (ở ngân hàng khác) mà chuyển tiền SANG vẫn tính là chi tiêu (VD tài khoản quỹ phòng)
  alwaysSpendAccounts: SpendAccount[];
}

export interface SpendAccount {
  accountNumber: string;
  name: string | null; // tên chủ tài khoản trong email
  bank: string | null;
}

const KEY = 'settings';
export const DEFAULT_SETTINGS: AppSettings = { monthStartDay: DEFAULT_MONTH_START_DAY, emailStartDate: null, emailIncoming: true, alwaysSpendAccounts: [] };

@Injectable()
export class SettingsService {
  // Đọc rất thường xuyên (mọi phép tính theo tháng) → cache trong bộ nhớ, làm mới khi lưu
  private cache: AppSettings | null = null;

  constructor(private readonly appState: AppStateService) {}

  async get(): Promise<AppSettings> {
    if (!this.cache) {
      const stored = await this.appState.get<Partial<AppSettings>>(KEY);
      this.cache = this.sanitize({ ...DEFAULT_SETTINGS, ...(stored ?? {}) });
    }
    return this.cache;
  }

  async monthStartDay(): Promise<number> {
    return (await this.get()).monthStartDay;
  }

  async emailStartDate(): Promise<string | null> {
    return (await this.get()).emailStartDate;
  }

  async emailIncoming(): Promise<boolean> {
    return (await this.get()).emailIncoming;
  }

  async alwaysSpendAccountNumbers(): Promise<Set<string>> {
    return new Set((await this.get()).alwaysSpendAccounts.map((a) => a.accountNumber));
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    // DTO có thể mang khóa với giá trị undefined (trường không gửi) → không được ghi đè giá trị đang có
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<AppSettings>;
    const next = this.sanitize({ ...(await this.get()), ...clean }, true);
    await this.appState.set(KEY, next);
    this.cache = next;
    return next;
  }

  private sanitize(s: AppSettings, strict = false): AppSettings {
    const out: AppSettings = { ...s };
    const day = Number(s.monthStartDay);
    if (!Number.isInteger(day) || day < MIN_MONTH_START_DAY || day > MAX_MONTH_START_DAY) {
      if (strict) throw new BadRequestException(`Ngày bắt đầu tháng phải từ ${MIN_MONTH_START_DAY} đến ${MAX_MONTH_START_DAY}`);
      out.monthStartDay = DEFAULT_MONTH_START_DAY;
    } else {
      out.monthStartDay = day;
    }
    if (s.emailStartDate !== null && s.emailStartDate !== undefined && !isValidDateStr(s.emailStartDate)) {
      if (strict) throw new BadRequestException('Ngày bắt đầu lấy email không hợp lệ');
      out.emailStartDate = null;
    } else {
      out.emailStartDate = s.emailStartDate ?? null;
    }
    if (typeof s.emailIncoming !== 'boolean') {
      if (strict) throw new BadRequestException('Tùy chọn lấy email tiền đến không hợp lệ');
      out.emailIncoming = DEFAULT_SETTINGS.emailIncoming;
    }
    // Danh sách lưu trực tiếp (không qua DTO cài đặt): chỉ giữ mục hợp lệ, bỏ trùng số tài khoản
    const seen = new Set<string>();
    out.alwaysSpendAccounts = (Array.isArray(s.alwaysSpendAccounts) ? s.alwaysSpendAccounts : []).filter((a): a is SpendAccount => {
      if (!a || typeof a.accountNumber !== 'string' || !/^[A-Za-z0-9]{4,40}$/.test(a.accountNumber) || seen.has(a.accountNumber)) return false;
      seen.add(a.accountNumber);
      return true;
    });
    return out;
  }
}
