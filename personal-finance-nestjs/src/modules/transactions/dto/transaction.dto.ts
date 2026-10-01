import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Bộ lọc danh sách / xuất Excel (query string). Các giá trị được hiểu trong utils/txn-filter.ts.
export class TransactionFilterDto {
  @IsOptional() @IsString() from?: string; // YYYY-MM-DD
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() direction?: string; // IN | OUT
  @IsOptional() @IsString() categoryId?: string; // số | "none"
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() categorizedBy?: string; // RULE | MANUAL | NONE
  @IsOptional() @IsString() excluded?: string; // "1"
  @IsOptional() @IsString() transfer?: string; // "1"
  @IsOptional() @IsString() min?: string;
  @IsOptional() @IsString() max?: string;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

// Nhập tay giao dịch (tiền mặt hoặc bổ sung cho tài khoản bất kỳ)
export class CreateTransactionDto {
  @IsInt() @IsPositive() accountId: number;

  @IsIn(['IN', 'OUT']) direction: 'IN' | 'OUT';

  @IsInt() @IsPositive() @Max(1e13) amount: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Nhập nội dung' })
  @MaxLength(500)
  content: string;

  @IsISO8601({ strict: true }) transactionDate: string;

  @IsOptional() @ValidateIf((o) => o.categoryId !== null) @IsInt() @IsPositive() categoryId?: number | null;

  @IsOptional() @ValidateIf((o) => o.note !== null) @IsString() @MaxLength(2000) note?: string | null;

  @IsOptional() @IsBoolean() excludeFromStats?: boolean;
}

export class UpdateTransactionDto {
  @IsOptional() @ValidateIf((o) => o.categoryId !== null) @IsInt() @IsPositive() categoryId?: number | null;
  @IsOptional() @ValidateIf((o) => o.note !== null) @IsString() @MaxLength(2000) note?: string | null;
  @IsOptional() @IsBoolean() excludeFromStats?: boolean;
  // Các trường dưới chỉ sửa được với giao dịch nhập tay
  @IsOptional() @IsInt() @IsPositive() @Max(1e13) amount?: number;
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(500) content?: string;
  @IsOptional() @IsISO8601({ strict: true }) transactionDate?: string;
  @IsOptional() @IsIn(['IN', 'OUT']) direction?: 'IN' | 'OUT';
  @IsOptional() @IsInt() @IsPositive() accountId?: number;
}

// Gán danh mục / cờ loại khỏi thống kê cho nhiều giao dịch
export class BulkUpdateTransactionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];

  @IsOptional() @ValidateIf((o) => o.categoryId !== null) @IsInt() @IsPositive() categoryId?: number | null;

  @IsOptional() @IsBoolean() excludeFromStats?: boolean;
}
