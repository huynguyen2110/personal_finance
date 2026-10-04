import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập' })
  @MaxLength(100)
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(200)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Nhập mật khẩu hiện tại' })
  @MaxLength(200)
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới cần ít nhất 8 ký tự' })
  @MaxLength(200)
  newPassword: string;
}
