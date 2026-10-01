import { Global, Module } from '@nestjs/common';
import { AppStateService } from './app-state.service';

// Service dùng chung cho mọi module (giống src/services của e-learning)
@Global()
@Module({
  providers: [AppStateService],
  exports: [AppStateService],
})
export class SharedServicesModule {}
