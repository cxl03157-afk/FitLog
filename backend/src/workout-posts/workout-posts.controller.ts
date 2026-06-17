import {
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateWorkoutPostDto } from './dto/create-workout-post.dto';
import { QueryWorkoutPostsDto } from './dto/query-workout-posts.dto';
import { UpdateWorkoutPostDto } from './dto/update-workout-post.dto';
import { WorkoutPostsService } from './workout-posts.service';

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
  findOne(@Param('id') id: string) {
    return this.workoutPostsService.findOne(id);
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
}
