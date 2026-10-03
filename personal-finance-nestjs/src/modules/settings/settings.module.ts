import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';

// Cài đặt chung (SettingsService nằm ở SharedServicesModule, dùng chung cho mọi module)
@Module({
  controllers: [SettingsController],
})
export class SettingsModule {}
