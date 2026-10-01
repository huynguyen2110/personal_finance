import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtUser } from '../decorators/current-user.decorator';

// Guard toàn cục (APP_GUARD): mọi route cần header "Authorization: Bearer <access_token>",
// trừ route đánh dấu @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const [type, token] = String(req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Chưa đăng nhập');

    try {
      req.user = await this.jwt.verifyAsync<JwtUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
  }
}
