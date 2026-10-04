import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MONTH_OR_DEFAULT = /^(\*|\d{4}-(0[1-9]|1[0-2]))$/;

export class BudgetQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Tháng không hợp lệ' })
  month?: string;
}

// Hạn mức của một danh mục (categoryId) hoặc của cả một nhóm chi tiêu (groupId) — gửi đúng một trong hai
export class BudgetItemDto {
  @ValidateIf((o) => o.groupId === undefined)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @ValidateIf((o) => o.categoryId === undefined)
  @IsInt()
  @IsPositive()
  groupId?: number;

  // "YYYY-MM" = chỉ tháng đó; "*" = mặc định mọi tháng
  @IsString()
  @Matches(MONTH_OR_DEFAULT, { message: 'Tháng không hợp lệ' })
  month: string;

  // null = xóa hạn mức (bắt buộc gửi lên: số hoặc null)
  @ValidateIf((o) => o.amount !== null)
  @IsInt()
  @Min(0)
  @Max(1e13)
  amount: number | null;
}

// Một hạn mức (categoryId, month, amount) hoặc nhiều hạn mức cùng lúc ({ items: [...] })
export class SaveBudgetsDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items?: BudgetItemDto[];

  @ValidateIf((o) => !o.items)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @ValidateIf((o) => !o.items)
  @IsString()
  @Matches(MONTH_OR_DEFAULT, { message: 'Tháng không hợp lệ' })
  month?: string;

  @ValidateIf((o) => !o.items && o.amount !== null)
  @IsInt()
  @Min(0)
  @Max(1e13)
  amount?: number | null;
}

export class CopyBudgetsDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Tháng không hợp lệ' })
  month: string;
}
