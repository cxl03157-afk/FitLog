import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryWorkoutPostsDto {
  @ApiPropertyOptional({
    description: 'ページ番号（1 始まり）',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '1 ページの取得件数（1〜100、デフォルト 20）',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'フィード種別。all: 全体、following: フォロー中のみ',
    enum: ['all', 'following'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'following'])
  feed?: 'all' | 'following' = 'all';

  @ApiPropertyOptional({
    description: '特定ユーザーの投稿に絞り込む（ユーザー ID）',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
