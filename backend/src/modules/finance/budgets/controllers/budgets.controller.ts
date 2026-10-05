import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { currentMonthVN } from '../../../../common/utils/dates.util';
import { SettingsService } from '../../../../services/settings.service';
import { BudgetsService } from '../services/budgets.service';
import { PlannedIncomeService } from '../services/planned-income.service';
import { BudgetItemDto, BudgetQueryDto, CopyBudgetsDto, SaveBudgetsDto } from '../dto/budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth('JWT-auth')
@Controller('api/budgets')
export class BudgetsController {
  constructor(
    private readonly budgets: BudgetsService,
    private readonly settings: SettingsService,
    private readonly plannedIncome: PlannedIncomeService,
  ) {}

  // Không truyền tháng → tháng tài chính hiện tại (theo ngày bắt đầu tháng trong cài đặt)
  @Get()
  async page(@Query() query: BudgetQueryDto) {
    const sd = await this.settings.monthStartDay();
    const page = await this.budgets.getBudgetPage(query.month ?? currentMonthVN(sd));
    if (!(await this.plannedIncome.isPlanned())) return { ...page, plannedIncome: null };
    // Chế độ chỉ lấy email tiền đi: thu nhập tháng = hạn mức + tiền tiết kiệm đã nạp trong tháng
    const plan = (await this.plannedIncome.byMonth([page.month], sd)).get(page.month)!;
    return { ...page, income: plan.total, plannedIncome: plan };
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
