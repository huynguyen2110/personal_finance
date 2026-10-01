import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

// Lấy lỗi đầu tiên (kể cả lỗi lồng trong mảng/object) thành dạng "field: thông báo"
function firstError(errors: ValidationError[], prefix = ''): string | null {
  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    if (e.constraints) {
      const msg = Object.values(e.constraints)[0];
      if (msg) return `${path}: ${msg}`;
    }
    if (e.children?.length) {
      const nested = firstError(e.children, path);
      if (nested) return nested;
    }
  }
  return null;
}

// whitelist: bỏ trường lạ; transform: chuyển body thành instance DTO.
// Không bật enableImplicitConversion (sẽ biến chuỗi "false" thành true) — query tự chuyển kiểu.
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException(firstError(errors) ?? 'Dữ liệu không hợp lệ'),
  });
}
