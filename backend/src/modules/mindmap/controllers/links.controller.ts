import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../../../common/decorators/current-user.decorator';
import { CreateLinkDto, UpdateLinkDto } from '../dto/link.dto';
import { LinksService } from '../services/links.service';

@ApiTags('Mindmap')
@ApiBearerAuth('JWT-auth')
@Controller('api/mindmap/mindmaps/:mindmapId/links')
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Param('mindmapId', ParseIntPipe) mindmapId: number) {
    return this.links.list(mindmapId, user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Param('mindmapId', ParseIntPipe) mindmapId: number, @Body() dto: CreateLinkDto) {
    return this.links.create(mindmapId, user.sub, dto);
  }

  @Patch(':linkId')
  update(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('linkId', ParseIntPipe) linkId: number,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.links.update(mindmapId, linkId, user.sub, dto);
  }

  @Delete(':linkId')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('linkId', ParseIntPipe) linkId: number,
  ) {
    return this.links.remove(mindmapId, linkId, user.sub);
  }
}
