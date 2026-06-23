import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BCRYPT_SALT_ROUNDS } from '../common/constants/auth.constants';
import { S3Service } from '../s3/s3.service';
import { RegisterDto } from './dto/register.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './user.entity';

export interface UserProfileDto {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface SearchUserDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
}

export interface UpdateProfileResponseDto {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly imageBaseUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly s3Service: S3Service,
    private readonly config: ConfigService,
  ) {
    this.imageBaseUrl = config.get<string>('IMAGE_BASE_URL', '');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(dto: RegisterDto): Promise<User> {
    const existingUsername = await this.usersRepository.findOne({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('このユーザー名はすでに使用されています');
    }

    const existingEmail = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('このメールアドレスはすでに登録されています');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = this.usersRepository.create({
      username: dto.username,
      displayName: dto.displayName,
      email: dto.email,
      passwordHash,
      bio: dto.bio ?? null,
    });

    return this.usersRepository.save(user);
  }

  async getProfile(
    userId: string,
    currentUserId: string,
  ): Promise<UserProfileDto> {
    const row = await this.usersRepository
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.username', 'username')
      .addSelect('u.displayName', 'displayName')
      .addSelect('u.bio', 'bio')
      .addSelect('u.avatarKey', 'avatarKey')
      .addSelect(
        '(SELECT COUNT(*)::int FROM workout_posts WHERE user_id = u.id)',
        'postCount',
      )
      .addSelect(
        '(SELECT COUNT(*)::int FROM follows WHERE followee_id = u.id)',
        'followerCount',
      )
      .addSelect(
        '(SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id)',
        'followingCount',
      )
      .addSelect(
        `EXISTS(SELECT 1 FROM follows WHERE follower_id = :currentUserId AND followee_id = u.id)`,
        'isFollowingRaw',
      )
      .where('u.id = :userId', { userId })
      .setParameter('currentUserId', currentUserId)
      .getRawOne<{
        id: string;
        username: string;
        displayName: string;
        bio: string | null;
        avatarKey: string | null;
        postCount: number;
        followerCount: number;
        followingCount: number;
        isFollowingRaw: boolean;
      }>();

    if (!row) {
      throw new NotFoundException('User not found');
    }

    return {
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      bio: row.bio,
      avatarUrl: row.avatarKey ? `${this.imageBaseUrl}/${row.avatarKey}` : null,
      postCount: Number(row.postCount),
      followerCount: Number(row.followerCount),
      followingCount: Number(row.followingCount),
      isFollowing: row.isFollowingRaw === true && userId !== currentUserId,
    };
  }

  async searchUsers(
    dto: SearchUsersDto,
    currentUserId: string,
  ): Promise<SearchUserDto[]> {
    const limit = dto.limit ?? 20;
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.username', 'username')
      .addSelect('u.displayName', 'displayName')
      .addSelect('u.avatarKey', 'avatarKey')
      .addSelect(
        `EXISTS(SELECT 1 FROM follows WHERE follower_id = :currentUserId AND followee_id = u.id)`,
        'isFollowing',
      )
      .where('u.username ILIKE :pattern', { pattern: `%${dto.username}%` })
      .setParameter('currentUserId', currentUserId)
      .orderBy('u.username', 'ASC')
      .limit(limit)
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

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UpdateProfileResponseDto> {
    const updates: Partial<User> = {};
    if (dto.displayName !== undefined) updates.displayName = dto.displayName;
    if (dto.bio !== undefined) updates.bio = dto.bio ?? null;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await this.usersRepository.update(userId, updates);
    }

    const updated = await this.findById(userId);
    return {
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      bio: updated.bio,
      avatarUrl: updated.avatarKey
        ? `${this.imageBaseUrl}/${updated.avatarKey}`
        : null,
    };
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarKey: string; avatarUrl: string }> {
    const user = await this.findById(userId);
    const oldAvatarKey = user.avatarKey;

    const ext = MIME_TO_EXT[file.mimetype] ?? 'bin';
    const newAvatarKey = `images/avatars/${userId}/${randomUUID()}.${ext}`;

    await this.s3Service.upload(newAvatarKey, file.buffer, file.mimetype);

    try {
      await this.usersRepository.update(userId, { avatarKey: newAvatarKey });
    } catch (err) {
      try {
        await this.s3Service.deleteOne(newAvatarKey);
      } catch (rollbackErr) {
        this.logger.error(
          'S3 rollback failed after avatar DB update error',
          rollbackErr,
        );
      }
      throw err;
    }

    if (oldAvatarKey) {
      try {
        await this.s3Service.deleteOne(oldAvatarKey);
      } catch (err) {
        this.logger.error(
          `Failed to delete old avatar key: ${oldAvatarKey}`,
          err,
        );
      }
    }

    return {
      avatarKey: newAvatarKey,
      avatarUrl: `${this.imageBaseUrl}/${newAvatarKey}`,
    };
  }
}
