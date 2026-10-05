import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { MINDMAP_TEMPLATES, type MindmapTemplateId } from '../utils/templates';

export const NODE_STATUSES = ['todo', 'doing', 'done'] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

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

  // Mẫu tạo sẵn thuộc tính (VD "growth" = phát triển bản thân); bỏ trống = mindmap trống
  @IsOptional()
  @IsIn(Object.keys(MINDMAP_TEMPLATES))
  template?: MindmapTemplateId;
}

export class UpdateMindmapDto extends PartialType(OmitType(CreateMindmapDto, ['template'] as const)) {}

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

  // Trạng thái hành động; null = không theo dõi
  @IsOptional()
  @IsIn(NODE_STATUSES)
  status?: NodeStatus | null;
}
