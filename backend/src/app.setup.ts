import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Cấu hình dùng chung cho main.ts và test e2e
export function setupApp(app: INestApplication) {
  const origins = (process.env.ALLOW_CORS ?? 'http://localhost:3002,http://localhost:3003')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    // Để FE đọc được tên file Excel khi tải về
    exposedHeaders: ['Content-Disposition'],
  });

  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Kiểm tra sống (không qua guard / envelope). Cron ngoài gọi định kỳ (< 15 phút) để Render không cho server ngủ.
  // Cố ý không truy vấn DB: Neon tự ngủ sau 5 phút, giữ nó thức 24/7 sẽ đốt hết giờ compute miễn phí.
  const health = (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  };
  app.getHttpAdapter().get('/health', health);
  app.getHttpAdapter().get('/api/health', health);

  const config = new DocumentBuilder()
    .setTitle('Personal Finance API')
    .setDescription('API theo dõi chi tiêu cá nhân')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
    .build();
  SwaggerModule.setup('api-docs', app, () => SwaggerModule.createDocument(app, config));
}
