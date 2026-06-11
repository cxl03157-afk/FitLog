import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateSetDto } from './dto/update-set.dto';
import { ExerciseSetsService } from './exercise-sets.service';

@Controller('exercise-sets')
@UseGuards(JwtAuthGuard)
export class ExerciseSetsController {
  constructor(private readonly exerciseSetsService: ExerciseSetsService) {}

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exerciseSetsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exerciseSetsService.remove(id, user.sub);
  }
}
