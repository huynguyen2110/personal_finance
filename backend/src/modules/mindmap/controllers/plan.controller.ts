import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../../../common/decorators/current-user.decorator';
import { PlanService } from '../services/plan.service';

@ApiTags('Mindmap')
@ApiBearerAuth('JWT-auth')
@Controller('api/mindmap/mindmaps/:mindmapId/plan')
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  // Lĩnh vực, hành động đã chấm điểm, gợi ý nên làm tiếp, việc đang bị chặn
  @Get()
  get(@CurrentUser() user: JwtUser, @Param('mindmapId', ParseIntPipe) mindmapId: number) {
    return this.plan.get(mindmapId, user.sub);
  }
}
