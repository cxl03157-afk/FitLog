import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'メールアドレス',
    format: 'email',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'パスワード（8文字以上）', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
