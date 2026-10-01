import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

// Nhóm chi tiêu / thu nhập (tầng trên danh mục cha). Mặc định icon/màu/thứ tự đặt trong service.
export class CreateCategoryGroupDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Nhập tên nhóm' })
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

  // Danh mục nhận giao dịch khi tài khoản chỉ gán nhóm này và không quy tắc nào khớp (phải thuộc nhóm)
  @IsOptional()
  @ValidateIf((o) => o.defaultCategoryId !== null)
  @IsInt()
  @IsPositive()
  defaultCategoryId?: number | null;

  // Các danh mục cha thuộc nhóm (gửi lên = thay toàn bộ danh sách)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  categoryIds?: number[];

  // Các tài khoản thường dùng nhóm này (gửi lên = thay toàn bộ danh sách)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  accountIds?: number[];
}

export class UpdateCategoryGroupDto extends PartialType(CreateCategoryGroupDto) {}
