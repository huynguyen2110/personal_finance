import { Module } from '@nestjs/common';
import { TransfersController } from './controllers/transfers.controller';
import { TransfersService } from './services/transfers.service';

@Module({
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
