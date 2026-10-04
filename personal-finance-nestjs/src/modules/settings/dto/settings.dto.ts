import { IsBoolean, IsInt, IsOptional, Matches, Max, Min, ValidateIf } from 'class-validator';
import { MAX_MONTH_START_DAY, MIN_MONTH_START_DAY } from '../../../common/utils/dates.util';

export class UpdateSettingsDto {
  // Ngày bắt đầu tháng tài chính (VD ngày nhận lương). 1 = tháng lịch. Tối đa 28 để tháng nào cũng có ngày này.
  @IsOptional()
  @IsInt()
  @Min(MIN_MONTH_START_DAY)
  @Max(MAX_MONTH_START_DAY)
  monthStartDay?: number;

  // Chỉ lấy giao dịch từ email ngân hàng kể từ ngày này ("YYYY-MM-DD"); null = bỏ giới hạn
  @IsOptional()
  @ValidateIf((o) => o.emailStartDate !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày bắt đầu lấy email không hợp lệ' })
  emailStartDate?: string | null;

  // false = chỉ lấy email tiền đi, bỏ qua email báo tiền đến
  @IsOptional()
  @IsBoolean()
  emailIncoming?: boolean;
}
