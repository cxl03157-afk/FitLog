import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'ユーザー名（英数字とアンダースコアのみ、3〜20文字）',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z0-9_]+$',
    example: 'fit_user',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'username must contain only alphanumeric characters and underscores',
  })
  username: string;

  @ApiProperty({
    description: '表示名（1〜50文字）',
    minLength: 1,
    maxLength: 50,
    example: 'Fit User',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName: string;

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

  @ApiPropertyOptional({
    description: '自己紹介（160文字以内）',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;
}
