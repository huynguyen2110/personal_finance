import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { toSearchParams } from '../../../../common/utils/search-params.util';
import { xlsxFile } from '../../../../common/utils/excel.util';
import { TransactionsService } from '../services/transactions.service';
import { TransactionsExportService } from '../services/transactions-export.service';
import {
  AlwaysSpendDto,
  BulkUpdateTransactionsDto,
  CreateTransactionDto,
  TransactionFilterDto,
  UpdateTransactionDto,
} from '../dto/transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('api/transactions')
export class TransactionsController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly exporter: TransactionsExportService,
  ) {}

  @Get()
  list(@Query() query: TransactionFilterDto) {
    return this.transactions.list(toSearchParams(query));
  }

  // Khai báo 'export' và 'bulk' trước ':id'
  @Get('export')
  async export(@Query() query: TransactionFilterDto, @Res({ passthrough: true }) res: Response) {
    const { workbook, filename } = await this.exporter.build(toSearchParams(query));
    return xlsxFile(workbook, filename, res);
  }

  // Các tài khoản của chính mình đã nhận tiền chuyển đi (mục Cài đặt → Chuyển cho chính bạn)
  @Get('self-transfer-accounts')
  selfTransferAccounts() {
    return this.transactions.selfTransferAccounts();
  }

  @Patch('bulk')
  bulk(@Body() dto: BulkUpdateTransactionsDto) {
    return this.transactions.bulkUpdate(dto);
  }

  // Luôn tính chi tiêu cho các lần chuyển sang một tài khoản của chính mình (khai báo trước các route ':id')
  @Post('always-spend')
  @HttpCode(200)
  alwaysSpend(@Body() dto: AlwaysSpendDto) {
    return this.transactions.setAlwaysSpend(dto);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.transactions.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransactionDto) {
    return this.transactions.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.transactions.remove(id);
  }

  @Post(':id/unpair')
  @HttpCode(200)
  unpair(@Param('id', ParseIntPipe) id: number) {
    return this.transactions.unpair(id);
  }
}
