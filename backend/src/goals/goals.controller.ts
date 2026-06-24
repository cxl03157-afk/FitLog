import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

@ApiTags('goals')
@ApiBearerAuth()
@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: '目標一覧取得（ステータスフィルタ可）' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_PROGRESS', 'ACHIEVED', 'ABANDONED'],
    description: '目標ステータスでフィルタ',
  })
  @ApiOkResponse({ description: 'Goal entity[]' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findAll(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.goalsService.findAll(user.sub, status);
  }

  @Post()
  @ApiOperation({
    summary: '目標登録（targetWeightKg / targetReps の少なくとも一方必須）',
  })
  @ApiCreatedResponse({ description: '作成された Goal entity' })
  @ApiBadRequestResponse({
    description:
      '400: targetWeightKg / targetReps 両方 null、または deadline が過去日',
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  create(@Body() dto: CreateGoalDto, @CurrentUser() user: JwtPayload) {
    return this.goalsService.create(dto, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: '目標更新（ステータスまたは deadline のみ更新可）' })
  @ApiParam({ name: 'id', description: '目標 ID' })
  @ApiOkResponse({ description: '更新後の Goal entity' })
  @ApiNotFoundResponse({ description: '目標が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.goalsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '目標削除（所有者のみ）' })
  @ApiParam({ name: 'id', description: '目標 ID' })
  @ApiNoContentResponse({ description: '削除成功' })
  @ApiNotFoundResponse({ description: '目標が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.goalsService.remove(id, user.sub);
  }
}
