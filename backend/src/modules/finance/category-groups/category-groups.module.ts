import { Module } from '@nestjs/common';
import { CategoryGroupsController } from './controllers/category-groups.controller';
import { CategoryGroupsService } from './services/category-groups.service';

// Nhóm chi tiêu / thu nhập: tầng trên danh mục cha, gán cho tài khoản để gợi ý và tự phân loại
@Module({
  controllers: [CategoryGroupsController],
  providers: [CategoryGroupsService],
})
export class CategoryGroupsModule {}
