import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoryGroupsService } from '../services/category-groups.service';
import { CreateCategoryGroupDto, UpdateCategoryGroupDto } from '../dto/category-group.dto';

@ApiTags('Category groups')
@ApiBearerAuth('JWT-auth')
@Controller('api/category-groups')
export class CategoryGroupsController {
  constructor(private readonly groups: CategoryGroupsService) {}

  @Get()
  list() {
    return this.groups.list();
  }

  @Post()
  create(@Body() dto: CreateCategoryGroupDto) {
    return this.groups.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryGroupDto) {
    return this.groups.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groups.remove(id);
  }
}
