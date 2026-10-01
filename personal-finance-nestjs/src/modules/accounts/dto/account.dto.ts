import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Giá trị mặc định (type CASH, số dư 0, hiển thị) đặt trong service — không gán ở đây
// để UpdateAccountDto (PartialType) không vô tình ghi đè trường không gửi lên.
export class CreateAccountDto {
  @IsOptional()
  @IsIn(['BANK', 'CASH'])
  type?: 'BANK' | 'CASH';

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Nhập tên tài khoản' })
  @MaxLength(80)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  bankName?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  accountNumber?: string | null;

  @IsOptional()
  @IsInt()
  @Min(-1e13)
  @Max(1e13)
  openingBalance?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Nhóm chi tiêu / thu nhập tài khoản này thường dùng (thay toàn bộ danh sách khi gửi lên)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  groupIds?: number[];
}

// Số tài khoản dùng để khớp email ngân hàng nên không cho sửa sau khi tạo
export class UpdateAccountDto extends PartialType(OmitType(CreateAccountDto, ['type', 'accountNumber'] as const)) {}
