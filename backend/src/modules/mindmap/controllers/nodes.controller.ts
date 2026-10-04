import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../../../common/decorators/current-user.decorator';
import { CreateNodeDto, UpdateNodeDto } from '../dto/mindmap.dto';
import { NodesService } from '../services/nodes.service';

@ApiTags('Mindmap')
@ApiBearerAuth('JWT-auth')
@Controller('api/mindmap/mindmaps/:mindmapId/nodes')
export class NodesController {
  constructor(private readonly nodes: NodesService) {}

  @Get()
  listTree(@CurrentUser() user: JwtUser, @Param('mindmapId', ParseIntPipe) mindmapId: number) {
    return this.nodes.listTree(mindmapId, user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Param('mindmapId', ParseIntPipe) mindmapId: number, @Body() dto: CreateNodeDto) {
    return this.nodes.create(mindmapId, user.sub, dto);
  }

  @Get(':nodeId')
  getDetail(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('nodeId', ParseIntPipe) nodeId: number,
  ) {
    return this.nodes.getDetail(mindmapId, nodeId, user.sub);
  }

  @Patch(':nodeId')
  update(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('nodeId', ParseIntPipe) nodeId: number,
    @Body() dto: UpdateNodeDto,
  ) {
    return this.nodes.update(mindmapId, nodeId, user.sub, dto);
  }

  @Delete(':nodeId')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('nodeId', ParseIntPipe) nodeId: number,
  ) {
    return this.nodes.remove(mindmapId, nodeId, user.sub);
  }
}
