import './common/utils/bigint-json.util';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`API chạy tại http://localhost:${port} (Swagger: /api-docs)`, 'Bootstrap');
}
bootstrap();
