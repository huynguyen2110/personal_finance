import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PollEmailDto {
  // Đọc lại thư trong N ngày gần nhất (bỏ qua mốc đã đọc). Trùng lặp được tự loại.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  sinceDays?: number;
}

export class ImportEmailDto {
  // Nội dung email thông báo copy từ trình đọc mail (văn bản) hoặc mã HTML gốc của thư
  @IsString()
  @MinLength(20, { message: 'Dán nội dung email' })
  @MaxLength(500_000)
  content: string;

  // true: chỉ đọc thử, không lưu
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
