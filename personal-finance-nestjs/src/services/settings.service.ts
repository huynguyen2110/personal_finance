import { BadRequestException, Injectable } from '@nestjs/common';
import { DEFAULT_MONTH_START_DAY, isValidDateStr, MAX_MONTH_START_DAY, MIN_MONTH_START_DAY } from '../common/utils/dates.util';
import { AppStateService } from './app-state.service';

// Cài đặt chung của ứng dụng (một người dùng), lưu trong AppState dưới một khóa JSON
export interface AppSettings {
  // Ngày bắt đầu "tháng" tài chính (VD ngày nhận lương). 1 = tháng lịch thông thường.
  monthStartDay: number;
  // Chỉ lấy giao dịch từ email ngân hàng kể từ ngày này ("YYYY-MM-DD"); null = không giới hạn (30 ngày gần nhất ở lần đầu)
  emailStartDate: string | null;
}

const KEY = 'settings';
export const DEFAULT_SETTINGS: AppSettings = { monthStartDay: DEFAULT_MONTH_START_DAY, emailStartDate: null };

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
    return out;
  }
}
