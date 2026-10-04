import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateTodoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  // "YYYY-MM-DD"
  @Matches(DATE, { message: 'date phải là YYYY-MM-DD' })
  date: string;

  // Các nhánh gắn với todo
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  nodeIds?: number[];
}

export class UpdateTodoDto extends PartialType(CreateTodoDto) {
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class QueryTodosDto {
  @Matches(DATE, { message: 'date phải là YYYY-MM-DD' })
  date: string;
}

export class WeeklyStatsDto {
  // Ngày đầu tuần (thứ hai) "YYYY-MM-DD"
  @Matches(DATE, { message: 'start phải là YYYY-MM-DD' })
  start: string;
}
