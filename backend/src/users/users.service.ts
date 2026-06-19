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
import { User } from './user.entity';

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
