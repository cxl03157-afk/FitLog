import { ApiProperty } from '@nestjs/swagger';

export class FollowUserDto {
  @ApiProperty({ description: 'ユーザー ID' })
  id: string;

  @ApiProperty({ description: 'ユーザー名' })
  username: string;

  @ApiProperty({ description: '表示名' })
  displayName: string;

  @ApiProperty({
    description: 'アバター URL（null の場合はイニシャル表示）',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({ description: '現在のユーザーがフォローしているか' })
  isFollowing: boolean;
}
