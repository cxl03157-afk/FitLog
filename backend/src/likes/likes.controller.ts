import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { LikesService } from './likes.service';

@Controller('workout-posts/:postId/likes')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Get('count')
  count(@Param('postId') postId: string) {
    return this.likesService.count(postId);
  }

  @Post()
  @HttpCode(201)
  add(@Param('postId') postId: string, @CurrentUser() user: JwtPayload) {
    return this.likesService.add(postId, user.sub);
  }

  @Delete()
  @HttpCode(204)
  remove(@Param('postId') postId: string, @CurrentUser() user: JwtPayload) {
    return this.likesService.remove(postId, user.sub);
  }
}
