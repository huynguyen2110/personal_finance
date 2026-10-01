import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GoalsService } from '../services/goals.service';
import { ArchiveGoalDto, CreateContributionDto, CreateGoalDto, LinkableTxnQueryDto, UpdateGoalDto } from '../dto/goal.dto';

@ApiTags('Savings goals')
@ApiBearerAuth('JWT-auth')
@Controller('api/goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  page() {
    return this.goals.getPage();
  }

  // Khai báo trước các route ':id'
  @Get('linkable-transactions')
  linkable(@Query() query: LinkableTxnQueryDto) {
    return this.goals.linkableTransactions(query.direction);
  }

  @Delete('contributions/:cid')
  removeContribution(@Param('cid', ParseIntPipe) cid: number) {
    return this.goals.removeContribution(cid);
  }

  @Post()
  create(@Body() dto: CreateGoalDto) {
    return this.goals.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGoalDto) {
    return this.goals.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.goals.remove(id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id', ParseIntPipe) id: number, @Body() dto: ArchiveGoalDto) {
    return this.goals.archive(id, dto.archived);
  }

  @Get(':id/contributions')
  contributions(@Param('id', ParseIntPipe) id: number) {
    return this.goals.listContributions(id);
  }

  @Post(':id/contributions')
  addContribution(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateContributionDto) {
    return this.goals.addContribution(id, dto);
  }
}
