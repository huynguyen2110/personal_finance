import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { xlsxFile } from '../../../common/utils/excel.util';
import { ReportsService } from '../services/reports.service';
import { ReportExportService } from '../services/report-export.service';
import { DashboardQueryDto, ReportQueryDto } from '../dto/report.dto';

@ApiTags('Stats')
@ApiBearerAuth('JWT-auth')
@Controller('api/stats')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exporter: ReportExportService,
  ) {}

  @Get('dashboard')
  dashboard(@Query() query: DashboardQueryDto) {
    return this.reports.getDashboard(this.reports.parseDashboardScope(query));
  }

  @Get('report')
  report(@Query() query: ReportQueryDto) {
    return this.reports.getReport(this.reports.parseReportScope(query));
  }

  @Get('report/export')
  async export(@Query() query: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    const { workbook, filename } = await this.exporter.build(this.reports.parseReportScope(query));
    return xlsxFile(workbook, filename, res);
  }
}
