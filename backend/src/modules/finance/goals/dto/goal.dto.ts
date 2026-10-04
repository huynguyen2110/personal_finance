import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GOAL_JARS = ['SAFETY', 'PURCHASE', 'EXPERIENCE', 'INVESTMENT', 'SELF', 'OTHER'] as const;
export const GOAL_PRIORITIES = ['HIGH', 'NORMAL', 'FLEXIBLE'] as const;
export type GoalJar = (typeof GOAL_JARS)[number];
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

// Giá trị mặc định (jar OTHER, priority NORMAL, icon) đặt trong service — không gán ở đây
// để UpdateGoalDto (PartialType) không ghi đè trường không gửi lên.
export class CreateGoalDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Nhập tên mục tiêu' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsIn(GOAL_JARS)
  jar?: GoalJar;

  @IsOptional()
  @IsIn(GOAL_PRIORITIES)
  priority?: GoalPriority;

  // Quỹ duy trì: tiêu bớt thì quay lại tích lũy (mặc định: true với hũ An toàn tài chính)
  @IsOptional()
  @IsBoolean()
  ongoing?: boolean;

  @IsInt({ message: 'Số tiền mục tiêu không hợp lệ' })
  @IsPositive({ message: 'Số tiền mục tiêu phải lớn hơn 0' })
  @Max(1e13)
  targetAmount: number;

  // "YYYY-MM-DD" (giờ VN); null = không đặt hạn
  @IsOptional()
  @Matches(DATE, { message: 'Thời hạn không hợp lệ' })
  @IsDateString({ strict: true }, { message: 'Thời hạn không hợp lệ' })
  deadline?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1e13)
  monthlyPlan?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  planDay?: number | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sourceAccountId?: number | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  holdingAccountId?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  holdingName?: string | null;

  // %/năm, VD 5.5
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Lãi suất không hợp lệ' })
  @Min(0)
  @Max(100)
  interestRate?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  // Số tiền đã có sẵn khi tạo (ghi thành một lần nạp "Số dư ban đầu")
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1e13)
  initialAmount?: number;
}

export class UpdateGoalDto extends PartialType(OmitType(CreateGoalDto, ['initialAmount'] as const)) {}

export class ArchiveGoalDto {
  @IsBoolean()
  archived: boolean;
}

// SPEND: tiêu tiền của quỹ cho đúng mục đích (không làm giảm tiến độ tích lũy)
export const CONTRIBUTION_KINDS = ['DEPOSIT', 'WITHDRAW', 'INTEREST', 'SPEND'] as const;
export type ContributionInputKind = (typeof CONTRIBUTION_KINDS)[number];

export class CreateContributionDto {
  @IsIn(CONTRIBUTION_KINDS)
  kind: ContributionInputKind;

  // Bỏ trống khi gắn giao dịch → lấy số tiền của giao dịch
  @IsOptional()
  @IsInt({ message: 'Số tiền không hợp lệ' })
  @IsPositive({ message: 'Số tiền phải lớn hơn 0' })
  @Max(1e13)
  amount?: number;

  // "YYYY-MM-DD" (giờ VN); bỏ trống → ngày của giao dịch gắn kèm, hoặc hôm nay
  @IsOptional()
  @Matches(DATE, { message: 'Ngày không hợp lệ' })
  date?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  transactionId?: number | null;

  // Khi gắn giao dịch: loại giao dịch đó khỏi thống kê thu chi (tiền để dành không phải khoản chi)
  @IsOptional()
  @IsBoolean()
  excludeFromStats?: boolean;
}

export class LinkableTxnQueryDto {
  @IsOptional()
  @IsIn(['IN', 'OUT'])
  direction?: 'IN' | 'OUT';
}
