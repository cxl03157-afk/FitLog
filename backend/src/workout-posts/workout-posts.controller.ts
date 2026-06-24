import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateWorkoutPostDto } from './dto/create-workout-post.dto';
import { QueryWorkoutPostsDto } from './dto/query-workout-posts.dto';
import { UpdateWorkoutPostDto } from './dto/update-workout-post.dto';
import { WorkoutPostsService } from './workout-posts.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@ApiTags('workout-posts')
@ApiBearerAuth()
@Controller('workout-posts')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class WorkoutPostsController {
  constructor(private readonly workoutPostsService: WorkoutPostsService) {}

  @Get()
  @ApiOperation({ summary: 'トレーニング投稿一覧取得（ページネーション付き）' })
  @ApiOkResponse({
    description:
      '投稿一覧（likeCount / commentCount / isLiked / postImages 含む）',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', description: 'WorkoutPost entity 配列' },
        total: { type: 'number', description: '総件数' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findAll(
    @Query() query: QueryWorkoutPostsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workoutPostsService.findAll(query, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'トレーニング投稿作成' })
  @ApiCreatedResponse({
    description:
      '作成された WorkoutPost entity（likeCount / commentCount / isLiked 含む）',
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  create(@Body() dto: CreateWorkoutPostDto, @CurrentUser() user: JwtPayload) {
    return this.workoutPostsService.create(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'トレーニング投稿詳細取得' })
  @ApiParam({ name: 'id', description: '投稿 ID' })
  @ApiOkResponse({
    description:
      'WorkoutPost entity（likeCount / commentCount / isLiked / postImages 含む）',
  })
  @ApiNotFoundResponse({ description: '投稿が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workoutPostsService.findOne(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'トレーニング投稿更新（所有者のみ）' })
  @ApiParam({ name: 'id', description: '投稿 ID' })
  @ApiOkResponse({ description: '更新後の WorkoutPost entity' })
  @ApiNotFoundResponse({ description: '投稿が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutPostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workoutPostsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'トレーニング投稿削除（所有者のみ）。S3 画像も連動削除',
  })
  @ApiParam({ name: 'id', description: '投稿 ID' })
  @ApiNoContentResponse({ description: '削除成功' })
  @ApiNotFoundResponse({ description: '投稿が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workoutPostsService.remove(id, user.sub);
  }

  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', 4, {
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
    summary: '投稿画像アップロード（JPEG/PNG/WebP, max 10MB, max 4 枚）',
  })
  @ApiParam({ name: 'id', description: '投稿 ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'JPEG/PNG/WebP, max 10MB each, max 4 files',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: '画像アップロード後の WorkoutPost entity',
  })
  @ApiNotFoundResponse({ description: '投稿が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      throw new BadRequestException(
        `File "${oversized.originalname}" exceeds the 10MB size limit`,
      );
    }
    return this.workoutPostsService.uploadImages(id, user.sub, files);
  }
}
