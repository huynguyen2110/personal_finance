import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { currentMonthVN, monthRange, todayVN } from '../../../../common/utils/dates.util';
import { SettingsService } from '../../../../services/settings.service';
import { UpdateSettingsDto } from '../dto/settings.dto';

@ApiTags('Settings')
@ApiBearerAuth('JWT-auth')
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Cài đặt + tháng tài chính hiện tại (để client hiển thị "đang ở tháng nào, từ ngày nào tới ngày nào")
  @Get()
  async get() {
    return this.withCurrent(await this.settings.get());
  }

  @Put()
  async update(@Body() dto: UpdateSettingsDto) {
    return this.withCurrent(await this.settings.update(dto));
  }

  private withCurrent(s: Awaited<ReturnType<SettingsService['get']>>) {
    const month = currentMonthVN(s.monthStartDay);
    return { ...s, today: todayVN(), currentMonth: month, currentRange: monthRange(month, s.monthStartDay) };
  }
}
