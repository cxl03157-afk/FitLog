import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { StatsService } from './stats.service';
import { ExerciseStatsQueryDto } from './dto/exercise-stats-query.dto';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('weekly')
  @ApiOperation({
    summary: '週間トレーニング統計（直近 12 週、月曜始まり、0 補完）',
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: '週の月曜日（YYYY-MM-DD）',
          },
          postCount: { type: 'number', description: '投稿数' },
          totalVolume: {
            type: 'number',
            description: 'totalVolume = SUM(weight_kg × reps)（自重は除く）',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  getWeeklyStats(@CurrentUser() user: JwtPayload) {
    return this.statsService.getWeeklyStats(user.sub);
  }

  @Get('monthly')
  @ApiOperation({ summary: '月間トレーニング統計（直近 12 ヶ月、0 補完）' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          period: { type: 'string', description: '年月（YYYY-MM）' },
          postCount: { type: 'number', description: '投稿数' },
          totalVolume: {
            type: 'number',
            description: 'totalVolume = SUM(weight_kg × reps)（自重は除く）',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  getMonthlyStats(@CurrentUser() user: JwtPayload) {
    return this.statsService.getMonthlyStats(user.sub);
  }

  @Get('exercise/:exerciseId')
  @ApiOperation({ summary: '種目別統計（直近 limit トレーニング日分）' })
  @ApiParam({ name: 'exerciseId', description: '種目 ID' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        exerciseId: { type: 'string' },
        exerciseName: { type: 'string' },
        metric: {
          type: 'string',
          enum: ['weight', 'reps', 'none'],
          description: '表示指標',
        },
        unit: {
          type: 'string',
          nullable: true,
          description: '"kg" | "reps" | null',
        },
        records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'YYYY-MM-DD' },
              value: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
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
