import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExercisesService } from './exercises.service';

@ApiTags('exercises')
@ApiBearerAuth()
@Controller('exercises')
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: '種目マスタ一覧取得' })
  @ApiOkResponse({ description: 'Exercise entity[]' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findAll() {
    return this.exercisesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '種目マスタ詳細取得' })
  @ApiParam({ name: 'id', description: '種目 ID' })
  @ApiOkResponse({ description: 'Exercise entity' })
  @ApiNotFoundResponse({ description: '種目が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
  }
}
