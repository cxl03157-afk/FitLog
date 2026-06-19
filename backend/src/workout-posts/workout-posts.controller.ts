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

@Controller('workout-posts')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class WorkoutPostsController {
  constructor(private readonly workoutPostsService: WorkoutPostsService) {}

  @Get()
  findAll(
    @Query() query: QueryWorkoutPostsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workoutPostsService.findAll(query, user.sub);
  }

  @Post()
  create(@Body() dto: CreateWorkoutPostDto, @CurrentUser() user: JwtPayload) {
    return this.workoutPostsService.create(dto, user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workoutPostsService.findOne(id, user.sub);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutPostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workoutPostsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
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
