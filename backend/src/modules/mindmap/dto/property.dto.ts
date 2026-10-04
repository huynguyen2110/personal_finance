import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export const PROPERTY_TYPES = ['text', 'number', 'boolean', 'date', 'select'] as const;
export type PropertyTypeName = (typeof PROPERTY_TYPES)[number];

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
