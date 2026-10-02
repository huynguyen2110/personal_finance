import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { currentMonthVN } from '../../../common/utils/dates.util';
import { SettingsService } from '../../../services/settings.service';
import { BudgetsService } from '../services/budgets.service';
import { BudgetItemDto, BudgetQueryDto, CopyBudgetsDto, SaveBudgetsDto } from '../dto/budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth('JWT-auth')
@Controller('api/budgets')
export class BudgetsController {
  constructor(
    private readonly budgets: BudgetsService,
    private readonly settings: SettingsService,
  ) {}

  // Không truyền tháng → tháng tài chính hiện tại (theo ngày bắt đầu tháng trong cài đặt)
  @Get()
  async page(@Query() query: BudgetQueryDto) {
    return this.budgets.getBudgetPage(query.month ?? currentMonthVN(await this.settings.monthStartDay()));
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
