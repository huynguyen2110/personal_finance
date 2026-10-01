import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
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
