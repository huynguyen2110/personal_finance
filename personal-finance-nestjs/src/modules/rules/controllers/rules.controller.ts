import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RulesService } from '../services/rules.service';
import { CategorizeService } from '../services/categorize.service';
import { CreateRuleDto, ReapplyRulesDto, TestRuleDto, UpdateRuleDto } from '../dto/rule.dto';

@ApiTags('Rules')
@ApiBearerAuth('JWT-auth')
@Controller('api/rules')
export class RulesController {
  constructor(
    private readonly rules: RulesService,
    private readonly categorize: CategorizeService,
  ) {}

  @Get()
  list() {
    return this.rules.list();
  }

  @Post()
  create(@Body() dto: CreateRuleDto) {
    return this.rules.create(dto);
  }

  // Khai báo trước ':id'
  @Post('test')
  @HttpCode(200)
  test(@Body() dto: TestRuleDto) {
    return this.rules.test(dto);
  }

  @Post('reapply')
  @HttpCode(200)
  async reapply(@Body() dto: ReapplyRulesDto) {
    return { changed: await this.categorize.reapplyRules({ includeRuleCategorized: dto.includeRuleCategorized ?? false }) };
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRuleDto) {
    return this.rules.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rules.remove(id);
  }
}
