import { Module } from '@nestjs/common';
import { RulesController } from './controllers/rules.controller';
import { RulesService } from './services/rules.service';
import { CategorizeService } from './services/categorize.service';

@Module({
  controllers: [RulesController],
  providers: [RulesService, CategorizeService],
  exports: [CategorizeService],
})
export class RulesModule {}
