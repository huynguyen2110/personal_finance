import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

// Lỗi trả về: { statusCode, message, error, path, timestamp } (giống e-learning).
// Lỗi Prisma thường gặp được đổi sang mã HTTP phù hợp; lỗi khác → 500.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi máy chủ';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const b = body as { message?: string | string[]; error?: string };
        message = Array.isArray(b.message) ? b.message[0] : (b.message ?? exception.message);
        error = b.error ?? exception.name;
      }
      if (typeof body === 'string') error = exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Không tìm thấy dữ liệu';
        error = 'Not Found';
      } else if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Dữ liệu bị trùng';
        error = 'Conflict';
      } else {
        this.logger.error(exception.message, exception.stack);
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.message : String(exception), (exception as Error)?.stack);
    }

    res.status(status).json({ statusCode: status, message, error, path: req.url, timestamp: new Date().toISOString() });
  }
}
