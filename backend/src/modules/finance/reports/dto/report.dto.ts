import { IsOptional, IsString } from 'class-validator';

// Query tổng quan: from/to (YYYY-MM-DD, giờ VN), accountId tùy chọn — kiểm tra chi tiết trong service
export class DashboardQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() accountId?: string;
}

// Query thống kê: fromMonth/toMonth (YYYY-MM), mặc định 6 tháng gần nhất
export class ReportQueryDto {
  @IsOptional() @IsString() fromMonth?: string;
  @IsOptional() @IsString() toMonth?: string;
  @IsOptional() @IsString() accountId?: string;
}
