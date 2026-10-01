import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

// JwtModule đăng ký global ở AppModule (dùng chung cho JwtAuthGuard)
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
