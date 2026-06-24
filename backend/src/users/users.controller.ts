import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const USER_PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    username: { type: 'string' },
    displayName: { type: 'string' },
    bio: { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
    postCount: { type: 'number' },
    followerCount: { type: 'number' },
    followingCount: { type: 'number' },
    isFollowing: { type: 'boolean' },
  },
} as const;

const SEARCH_USER_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    username: { type: 'string' },
    displayName: { type: 'string' },
    avatarUrl: { type: 'string', nullable: true },
    isFollowing: { type: 'boolean' },
  },
} as const;

const UPDATE_PROFILE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    username: { type: 'string' },
    displayName: { type: 'string' },
    bio: { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
  },
} as const;

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/search must be declared before GET /users/:id
  @Get('search')
  @ApiOperation({ summary: 'ユーザー検索（username 部分一致）' })
  @ApiOkResponse({
    description: '検索結果（isFollowing 含む）',
    schema: { type: 'array', items: SEARCH_USER_SCHEMA },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  searchUsers(@Query() query: SearchUsersDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.searchUsers(query, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ユーザープロフィール取得' })
  @ApiParam({ name: 'id', description: 'ユーザー ID' })
  @ApiOkResponse({
    description:
      'プロフィール（postCount / followerCount / followingCount / isFollowing 含む）',
    schema: USER_PROFILE_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  getProfile(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(id, user.sub);
  }

  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, webp`,
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({
    summary: 'アバター画像をアップロード（JPEG/PNG/WebP, max 10MB）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'アバター画像（JPEG/PNG/WebP, max 10MB）',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'アップロード成功',
    schema: {
      type: 'object',
      properties: {
        avatarKey: { type: 'string', description: 'S3 object key' },
        avatarUrl: { type: 'string', description: '表示 URL' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the 10MB size limit');
    }
    return this.usersService.uploadAvatar(user.sub, file);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'プロフィール更新（displayName / bio）' })
  @ApiOkResponse({
    description: '更新後のプロフィール',
    schema: UPDATE_PROFILE_RESPONSE_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }
}
