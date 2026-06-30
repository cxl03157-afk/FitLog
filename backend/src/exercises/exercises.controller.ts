import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('exercises')
@ApiBearerAuth()
@Controller('exercises')
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: '種目一覧取得（標準＋本人独自）' })
  @ApiOkResponse({ description: 'Exercise entity[]' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.exercisesService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '種目詳細取得' })
  @ApiParam({ name: 'id', description: '種目 ID' })
  @ApiOkResponse({ description: 'Exercise entity' })
  @ApiNotFoundResponse({
    description: '種目が存在しない / 他ユーザーの独自種目',
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exercisesService.findVisibleOne(id, user.sub);
  }

  @Post()
  @ApiOperation({ summary: '独自種目作成' })
  @ApiCreatedResponse({ description: '作成された Exercise entity' })
  @ApiConflictResponse({ description: '同名の種目が存在する' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  create(@Body() dto: CreateExerciseDto, @CurrentUser() user: JwtPayload) {
    return this.exercisesService.create(dto, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: '独自種目更新' })
  @ApiParam({ name: 'id', description: '種目 ID' })
  @ApiOkResponse({ description: '更新後の Exercise entity' })
  @ApiForbiddenResponse({ description: '標準種目 / 他ユーザーの独自種目' })
  @ApiNotFoundResponse({ description: '種目が存在しない' })
  @ApiConflictResponse({ description: '同名の種目が存在する' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exercisesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '独自種目削除' })
  @ApiParam({ name: 'id', description: '種目 ID' })
  @ApiNoContentResponse({ description: '削除成功' })
  @ApiForbiddenResponse({ description: '標準種目 / 他ユーザーの独自種目' })
  @ApiNotFoundResponse({ description: '種目が存在しない' })
  @ApiConflictResponse({ description: '使用中のため削除不可' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exercisesService.remove(id, user.sub);
  }
}
