import { Global, Module } from '@nestjs/common';
import { AppStateService } from './app-state.service';
import { SettingsService } from './settings.service';

// Service dùng chung cho mọi module (giống src/services của e-learning)
@Global()
@Module({
  providers: [AppStateService, SettingsService],
  exports: [AppStateService, SettingsService],
})
export class SharedServicesModule {}
