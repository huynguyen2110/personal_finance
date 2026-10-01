import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TRANSFER_WINDOW_MINUTES, TransfersService } from '../services/transfers.service';

@ApiTags('Transfers')
@ApiBearerAuth('JWT-auth')
@Controller('api/transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  // Thống kê nhanh số cặp đang có
  @Get('scan')
  async status() {
    return { pairs: await this.transfers.countPairs(), windowMinutes: TRANSFER_WINDOW_MINUTES };
  }

  // Quét lại toàn bộ giao dịch chưa ghép
  @Post('scan')
  @HttpCode(200)
  async scan() {
    const paired = await this.transfers.scanTransfers();
    return { paired, pairs: await this.transfers.countPairs() };
  }
}
