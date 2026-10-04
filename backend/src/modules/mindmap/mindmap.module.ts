import { Module } from '@nestjs/common';
import { LinksController } from './controllers/links.controller';
import { MindmapsController } from './controllers/mindmaps.controller';
import { NodesController } from './controllers/nodes.controller';
import { PropertiesController } from './controllers/properties.controller';
import { TodosController } from './controllers/todos.controller';
import { LinksService } from './services/links.service';
import { MindmapsService } from './services/mindmaps.service';
import { NodesService } from './services/nodes.service';
import { PropertiesService } from './services/properties.service';
import { TodosService } from './services/todos.service';

// Module Mindmap: sơ đồ tư duy, trang ghi chú cho từng nhánh, thuộc tính tùy chỉnh, liên kết giữa nhánh, todo hằng ngày. Route: api/mindmap/*
@Module({
  controllers: [MindmapsController, NodesController, PropertiesController, LinksController, TodosController],
  providers: [MindmapsService, NodesService, PropertiesService, LinksService, TodosService],
})
export class MindmapModule {}
