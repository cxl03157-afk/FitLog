import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateSetDto } from './dto/create-set.dto';
import { WorkoutExercisesService } from './workout-exercises.service';

@ApiTags('workout-exercises')
@ApiBearerAuth()
@Controller('workout-exercises')
@UseGuards(JwtAuthGuard)
export class WorkoutExercisesController {
  constructor(
    private readonly workoutExercisesService: WorkoutExercisesService,
  ) {}

  @Post(':id/sets')
  @ApiOperation({ summary: 'ワークアウト種目にセットを追加' })
  @ApiParam({ name: 'id', description: 'WorkoutExercise ID' })
  @ApiCreatedResponse({ description: '作成された ExerciseSet entity' })
  @ApiNotFoundResponse({ description: 'WorkoutExercise が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  addSet(
    @Param('id') id: string,
    @Body() dto: CreateSetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workoutExercisesService.addSet(id, dto, user.sub);
  }
}
