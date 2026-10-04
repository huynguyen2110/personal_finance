import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';

// Bọc mọi response thành công: { statusCode, timestamp, duration, data } (giống e-learning).
// File tải về (StreamableFile, VD Excel) giữ nguyên.
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    const res = ctx.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) =>
        data instanceof StreamableFile
          ? data
          : {
              statusCode: res.statusCode,
              timestamp: new Date().toISOString(),
              duration: `${Date.now() - started}ms`,
              data: data ?? null,
            },
      ),
    );
  }
}
