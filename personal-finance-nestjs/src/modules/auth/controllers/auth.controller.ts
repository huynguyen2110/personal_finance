import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, type JwtUser } from '../../../common/decorators/current-user.decorator';
import { AuthService } from '../services/auth.service';
import { LoginDto, RefreshTokenDto } from '../dto/auth.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.logout(dto.refresh_token);
    return { ok: true };
  }

  @ApiBearerAuth('JWT-auth')
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.sub);
  }
}
