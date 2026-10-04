import { Module } from '@nestjs/common';
import { MindmapsController } from './controllers/mindmaps.controller';
import { NodesController } from './controllers/nodes.controller';
import { PropertiesController } from './controllers/properties.controller';
import { TodosController } from './controllers/todos.controller';
import { MindmapsService } from './services/mindmaps.service';
import { NodesService } from './services/nodes.service';
import { PropertiesService } from './services/properties.service';
import { TodosService } from './services/todos.service';

// Module Mindmap: sơ đồ tư duy, trang ghi chú cho từng nhánh, thuộc tính tùy chỉnh, todo hằng ngày. Route: api/mindmap/*
@Module({
  controllers: [MindmapsController, NodesController, PropertiesController, TodosController],
  providers: [MindmapsService, NodesService, PropertiesService, TodosService],
})
export class MindmapModule {}
