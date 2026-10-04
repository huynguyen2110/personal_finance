import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Route không cần đăng nhập (JwtAuthGuard bỏ qua). Route tự xác thực cách khác thì tự kiểm tra.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
