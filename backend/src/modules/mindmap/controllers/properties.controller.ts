import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../../../common/decorators/current-user.decorator';
import { CreatePropertyDto, SetNodeValuesDto, UpdatePropertyDto } from '../dto/property.dto';
import { PropertiesService } from '../services/properties.service';

@ApiTags('Mindmap')
@ApiBearerAuth('JWT-auth')
@Controller('api/mindmap/mindmaps/:mindmapId')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get('properties')
  list(@CurrentUser() user: JwtUser, @Param('mindmapId', ParseIntPipe) mindmapId: number) {
    return this.properties.list(mindmapId, user.sub);
  }

  @Post('properties')
  create(@CurrentUser() user: JwtUser, @Param('mindmapId', ParseIntPipe) mindmapId: number, @Body() dto: CreatePropertyDto) {
    return this.properties.create(mindmapId, user.sub, dto);
  }

  @Patch('properties/:propId')
  update(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('propId', ParseIntPipe) propId: number,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.properties.update(mindmapId, propId, user.sub, dto);
  }

  @Delete('properties/:propId')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('propId', ParseIntPipe) propId: number,
  ) {
    return this.properties.remove(mindmapId, propId, user.sub);
  }

  @Put('nodes/:nodeId/properties')
  setNodeValues(
    @CurrentUser() user: JwtUser,
    @Param('mindmapId', ParseIntPipe) mindmapId: number,
    @Param('nodeId', ParseIntPipe) nodeId: number,
    @Body() dto: SetNodeValuesDto,
  ) {
    return this.properties.setNodeValues(mindmapId, nodeId, user.sub, dto);
  }
}
