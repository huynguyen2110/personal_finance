import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateMindmapDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Nhập tên mindmap' })
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateMindmapDto extends PartialType(CreateMindmapDto) {}

export class CreateNodeDto {
  // Id của node cha
  @IsInt()
  parentId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  // Vị trí trong các node anh em; bỏ trống = cuối danh sách
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  // Đổi node cha (kéo nhánh sang chỗ khác)
  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  collapsed?: boolean;

  // Màu hex của nhánh; null = kế thừa
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string | null;

  // Nội dung trang (TipTap JSON)
  @IsOptional()
  @IsObject()
  pageContent?: object;
}
