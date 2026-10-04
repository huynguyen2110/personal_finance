import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Payload của access token (JWT)
export interface JwtUser {
  sub: number; // id người dùng
  username: string;
}

// Lấy người dùng đang đăng nhập (JwtAuthGuard gán vào req.user)
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtUser => {
  return ctx.switchToHttp().getRequest().user;
});
