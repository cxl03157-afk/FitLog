import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateSetDto } from './dto/create-set.dto';
import { WorkoutExercisesService } from './workout-exercises.service';

@Controller('workout-exercises')
@UseGuards(JwtAuthGuard)
export class WorkoutExercisesController {
  constructor(private readonly workoutExercisesService: WorkoutExercisesService) {}

  @Post(':id/sets')
  addSet(
    @Param('id') id: string,
    @Body() dto: CreateSetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workoutExercisesService.addSet(id, dto, user.sub);
  }
}
