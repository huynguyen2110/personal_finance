import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export const PROPERTY_TYPES = ['text', 'number', 'boolean', 'date', 'select'] as const;
export type PropertyTypeName = (typeof PROPERTY_TYPES)[number];

// Ý nghĩa của thuộc tính trong view kế hoạch; priority/difficulty là select, time/cost là number
export const PROPERTY_ROLES = ['priority', 'difficulty', 'time', 'cost'] as const;
export type PropertyRole = (typeof PROPERTY_ROLES)[number];
export const ROLE_TYPE: Record<PropertyRole, PropertyTypeName> = {
  priority: 'select',
  difficulty: 'select',
  time: 'number',
  cost: 'number',
};
export const ROLE_LABEL: Record<PropertyRole, string> = {
  priority: 'Ưu tiên',
  difficulty: 'Độ khó',
  time: 'Thời gian',
  cost: 'Chi phí',
};

// Đơn vị hiển thị của kiểu number
export const PROPERTY_UNITS = ['money', 'hours'] as const;
export type PropertyUnit = (typeof PROPERTY_UNITS)[number];

export class SelectOptionDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  // Màu hex, VD "#0ca678"
  @IsString()
  @MaxLength(20)
  color: string;

  // Mức (0–10) dùng để chấm điểm kế hoạch, VD Ưu tiên cao = 3; bỏ trống = theo thứ tự lựa chọn
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  weight?: number;
}

export class CreatePropertyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsIn(PROPERTY_TYPES)
  type: PropertyTypeName;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectOptionDto)
  options?: SelectOptionDto[];

  // null = bỏ vai trò
  @IsOptional()
  @IsIn(PROPERTY_ROLES)
  role?: PropertyRole | null;

  // null = không đơn vị
  @IsOptional()
  @IsIn(PROPERTY_UNITS)
  unit?: PropertyUnit | null;
}

// Không đổi được kiểu sau khi tạo (giá trị đã lưu sẽ lệch kiểu)
export class UpdatePropertyDto extends PartialType(OmitType(CreatePropertyDto, ['type'] as const)) {
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class SetNodeValuesDto {
  // propertyDefinitionId → giá trị; null = xóa giá trị đó
  @IsObject()
  values: Record<string, unknown>;
}
