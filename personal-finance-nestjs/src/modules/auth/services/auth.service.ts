import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service';
import { verifyPassword } from '../utils/password.util';
import type { JwtUser } from '../../../common/decorators/current-user.decorator';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: { id: number; username: string };
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private refreshDays(): number {
    const d = Number(process.env.JWT_REFRESH_DAYS ?? 30);
    return Number.isFinite(d) && d > 0 ? d : 30;
  }

  // Cấp cặp token mới: access token JWT (ngắn hạn) + refresh token ngẫu nhiên (lưu mã băm)
  private async issue(user: { id: number; username: string }): Promise<AuthTokens> {
    const payload: JwtUser = { sub: user.id, username: user.username };
    const access_token = await this.jwt.signAsync(payload);
    const refresh_token = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refresh_token),
        expiresAt: new Date(Date.now() + this.refreshDays() * 86400e3),
      },
    });
    return { access_token, refresh_token, user: { id: user.id, username: user.username } };
  }

  async login(username: string, password: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    // Thông báo chung để không lộ tài khoản nào tồn tại
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }
    // Dọn refresh token đã hết hạn của người dùng
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    return this.issue(user);
  }

  // Xoay vòng: refresh token cũ bị xóa, trả cặp token mới
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!row || row.expiresAt < new Date()) {
      if (row) await this.prisma.refreshToken.delete({ where: { id: row.id } }).catch(() => {});
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    return this.issue(row.user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(refreshToken) } });
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    return { userId: user.id, username: user.username };
  }
}
