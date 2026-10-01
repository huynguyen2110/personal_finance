import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

// Mặc định matchType/priority/isActive đặt trong service (xem ghi chú ở CreateAccountDto)
export class CreateRuleDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Nhập từ khóa' })
  @MaxLength(500)
  pattern: string;

  @IsOptional()
  @IsIn(['CONTAINS', 'REGEX'])
  matchType?: 'CONTAINS' | 'REGEX';

  @IsInt()
  @IsPositive()
  categoryId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Chỉ áp dụng cho giao dịch của một tài khoản (null = mọi tài khoản)
  @IsOptional()
  @ValidateIf((o) => o.accountId !== null)
  @IsInt()
  @IsPositive()
  accountId?: number | null;
}

export class UpdateRuleDto extends PartialType(CreateRuleDto) {}

export class TestRuleDto {
  @IsString()
  @MaxLength(1000)
  content: string;

  @IsIn(['IN', 'OUT'])
  direction: 'IN' | 'OUT';

  // Giao dịch thuộc tài khoản nào (để khớp quy tắc giới hạn theo tài khoản và danh mục mặc định theo nhóm)
  @IsOptional()
  @IsInt()
  @IsPositive()
  accountId?: number;
}

export class ReapplyRulesDto {
  @IsOptional()
  @IsBoolean()
  includeRuleCategorized?: boolean;
}
