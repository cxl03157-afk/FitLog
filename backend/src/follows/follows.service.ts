import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Follow } from './entities/follow.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly usersService: UsersService,
  ) {}

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

  async getFollowers(userId: string): Promise<Follow[]> {
    await this.usersService.findById(userId);
    return this.followRepository.find({
      where: { followeeId: userId },
      relations: { follower: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getFollowing(userId: string): Promise<Follow[]> {
    await this.usersService.findById(userId);
    return this.followRepository.find({
      where: { followerId: userId },
      relations: { followee: true },
      order: { createdAt: 'DESC' },
    });
  }
}
