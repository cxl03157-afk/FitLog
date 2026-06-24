import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { FollowUserDto } from './dto/follow-user.dto';
import { Follow } from './entities/follow.entity';

@Injectable()
export class FollowsService {
  private readonly imageBaseUrl: string;

  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {
    this.imageBaseUrl = config.get<string>('IMAGE_BASE_URL', '');
  }

  async follow(followeeId: string, followerId: string): Promise<Follow> {
    if (followerId === followeeId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    await this.usersService.findById(followeeId);

    const follow = this.followRepository.create({ followerId, followeeId });
    try {
      return await this.followRepository.save(follow);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === '23505'
      ) {
        throw new ConflictException('Already following this user');
      }
      throw err;
    }
  }

  async unfollow(followeeId: string, followerId: string): Promise<void> {
    await this.usersService.findById(followeeId);
    const follow = await this.followRepository.findOne({
      where: { followerId, followeeId },
    });
    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }
    await this.followRepository.delete(follow.id);
  }

  async getFollowers(
    userId: string,
    currentUserId: string,
  ): Promise<FollowUserDto[]> {
    await this.usersService.findById(userId);

    const rows = await this.followRepository
      .createQueryBuilder('f')
      .innerJoin('f.follower', 'u')
      .select('u.id', 'id')
      .addSelect('u.username', 'username')
      .addSelect('u.displayName', 'displayName')
      .addSelect('u.avatarKey', 'avatarKey')
      .addSelect(
        `EXISTS(SELECT 1 FROM follows mf WHERE mf.follower_id = :currentUserId AND mf.followee_id = u.id)`,
        'isFollowing',
      )
      .where('f.followeeId = :userId', { userId })
      .setParameter('currentUserId', currentUserId)
      .orderBy('f.createdAt', 'DESC')
      .getRawMany<{
        id: string;
        username: string;
        displayName: string;
        avatarKey: string | null;
        isFollowing: boolean;
      }>();

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarKey ? `${this.imageBaseUrl}/${row.avatarKey}` : null,
      isFollowing: row.isFollowing === true,
    }));
  }

  async getFollowing(
    userId: string,
    currentUserId: string,
  ): Promise<FollowUserDto[]> {
    await this.usersService.findById(userId);

    const rows = await this.followRepository
      .createQueryBuilder('f')
      .innerJoin('f.followee', 'u')
      .select('u.id', 'id')
      .addSelect('u.username', 'username')
      .addSelect('u.displayName', 'displayName')
      .addSelect('u.avatarKey', 'avatarKey')
      .addSelect(
        `EXISTS(SELECT 1 FROM follows mf WHERE mf.follower_id = :currentUserId AND mf.followee_id = u.id)`,
        'isFollowing',
      )
      .where('f.followerId = :userId', { userId })
      .setParameter('currentUserId', currentUserId)
      .orderBy('f.createdAt', 'DESC')
      .getRawMany<{
        id: string;
        username: string;
        displayName: string;
        avatarKey: string | null;
        isFollowing: boolean;
      }>();

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarKey ? `${this.imageBaseUrl}/${row.avatarKey}` : null,
      isFollowing: row.isFollowing === true,
    }));
  }
}
