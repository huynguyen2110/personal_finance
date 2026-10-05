import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../../../common/decorators/current-user.decorator';
import { CreateMindmapDto, UpdateMindmapDto } from '../dto/mindmap.dto';
import { MindmapsService } from '../services/mindmaps.service';

@ApiTags('Mindmap')
@ApiBearerAuth('JWT-auth')
@Controller('api/mindmap/mindmaps')
export class MindmapsController {
  constructor(private readonly mindmaps: MindmapsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.mindmaps.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateMindmapDto) {
    return this.mindmaps.create(user.sub, dto);
  }

  // Bản đồ "Phát triển bản thân" của người dùng (module chỉ dùng một bản): khai báo trước ':id'
  @Get('primary')
  primary(@CurrentUser() user: JwtUser) {
    return this.mindmaps.getOrCreatePrimary(user.sub);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.mindmaps.get(id, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMindmapDto) {
    return this.mindmaps.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.mindmaps.remove(id, user.sub);
  }
}
