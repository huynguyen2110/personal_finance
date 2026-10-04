import { PartialType, PickType } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export const LINK_KINDS = ['supports', 'prerequisite', 'related'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export class CreateLinkDto {
  // supports: nguồn bổ trợ đích · prerequisite: nguồn phải xong trước đích · related: tự do
  @IsInt()
  sourceNodeId: number;

  @IsInt()
  targetNodeId: number;

  @IsIn(LINK_KINDS)
  kind: LinkKind;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class UpdateLinkDto extends PartialType(PickType(CreateLinkDto, ['kind', 'note'] as const)) {}
