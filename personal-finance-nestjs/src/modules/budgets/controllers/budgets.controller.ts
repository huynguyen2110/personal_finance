import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { currentMonthVN } from '../../../common/utils/dates.util';
import { BudgetsService } from '../services/budgets.service';
import { BudgetItemDto, BudgetQueryDto, CopyBudgetsDto, SaveBudgetsDto } from '../dto/budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth('JWT-auth')
@Controller('api/budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  page(@Query() query: BudgetQueryDto) {
    return this.budgets.getBudgetPage(query.month ?? currentMonthVN());
  }

  @Put()
  save(@Body() dto: SaveBudgetsDto) {
    const items: BudgetItemDto[] = dto.items ?? [
      { categoryId: dto.categoryId!, month: dto.month!, amount: dto.amount ?? null },
    ];
    return this.budgets.save(items);
  }

  @Post('copy')
  @HttpCode(200)
  copy(@Body() dto: CopyBudgetsDto) {
    return this.budgets.copyFromPreviousMonth(dto.month);
  }
}
