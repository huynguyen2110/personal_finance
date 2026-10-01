import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
