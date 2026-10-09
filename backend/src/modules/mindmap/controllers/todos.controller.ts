import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../../../common/decorators/current-user.decorator';
import { CreateTodoDto, QueryTodosDto, RangeStatsDto, UpdateTodoDto, WeeklyStatsDto } from '../dto/todo.dto';
import { TodosService } from '../services/todos.service';

@ApiTags('Mindmap')
@ApiBearerAuth('JWT-auth')
@Controller('api/mindmap/todos')
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get()
  listByDate(@CurrentUser() user: JwtUser, @Query() query: QueryTodosDto) {
    return this.todos.listByDate(user.sub, query.date);
  }

  // Khai báo trước các route có tham số
  @Get('node-options')
  nodeOptions(@CurrentUser() user: JwtUser) {
    return this.todos.nodeOptions(user.sub);
  }

  @Get('streak')
  streak(@CurrentUser() user: JwtUser) {
    return this.todos.streak(user.sub);
  }

  @Get('stats/range')
  rangeStats(@CurrentUser() user: JwtUser, @Query() query: RangeStatsDto) {
    return this.todos.rangeStats(user.sub, query.from, query.to);
  }

  @Get('stats/weekly')
  weeklyStats(@CurrentUser() user: JwtUser, @Query() query: WeeklyStatsDto) {
    return this.todos.weeklyStats(user.sub, query.start);
  }

  @Get('by-node/:nodeId')
  listByNode(@CurrentUser() user: JwtUser, @Param('nodeId', ParseIntPipe) nodeId: number) {
    return this.todos.listByNode(user.sub, nodeId);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateTodoDto) {
    return this.todos.create(user.sub, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTodoDto) {
    return this.todos.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.todos.remove(user.sub, id);
  }
}
