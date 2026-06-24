import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { UpdateSetDto } from './dto/update-set.dto';
import { ExerciseSetsService } from './exercise-sets.service';

@ApiTags('exercise-sets')
@ApiBearerAuth()
@Controller('exercise-sets')
@UseGuards(JwtAuthGuard)
export class ExerciseSetsController {
  constructor(private readonly exerciseSetsService: ExerciseSetsService) {}

  @Put(':id')
  @ApiOperation({ summary: 'セット記録を更新（所有者のみ）' })
  @ApiParam({ name: 'id', description: 'ExerciseSet ID' })
  @ApiOkResponse({ description: '更新後の ExerciseSet entity' })
  @ApiNotFoundResponse({ description: 'セットが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exerciseSetsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'セット記録を削除（所有者のみ）' })
  @ApiParam({ name: 'id', description: 'ExerciseSet ID' })
  @ApiNoContentResponse({ description: '削除成功' })
  @ApiNotFoundResponse({ description: 'セットが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exerciseSetsService.remove(id, user.sub);
  }
}
