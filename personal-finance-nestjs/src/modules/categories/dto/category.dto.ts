import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

// Mặc định icon/màu/thứ tự đặt trong service (xem ghi chú ở CreateAccountDto)
export class CreateCategoryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Nhập tên danh mục' })
  @MaxLength(60)
  name: string;

  @IsIn(['EXPENSE', 'INCOME'])
  kind: 'EXPENSE' | 'INCOME';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Màu không hợp lệ' })
  color?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  // Danh mục cha (null = danh mục cấp cao nhất). Cha phải cùng loại và chính nó không có cha.
  @IsOptional()
  @ValidateIf((o) => o.parentId !== null)
  @IsInt()
  @IsPositive()
  parentId?: number | null;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
