import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { StatsService } from './stats.service';
import { ExerciseStatsQueryDto } from './dto/exercise-stats-query.dto';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('weekly')
  getWeeklyStats(@CurrentUser() user: JwtPayload) {
    return this.statsService.getWeeklyStats(user.sub);
  }

  @Get('monthly')
  getMonthlyStats(@CurrentUser() user: JwtPayload) {
    return this.statsService.getMonthlyStats(user.sub);
  }

  @Get('exercise/:exerciseId')
  getExerciseStats(
    @Param('exerciseId') exerciseId: string,
    @Query() query: ExerciseStatsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.statsService.getExerciseStats(
      user.sub,
      exerciseId,
      query.limit,
    );
  }
}
