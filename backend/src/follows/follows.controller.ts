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
import { FollowsService } from './follows.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post('follows/:userId')
  @HttpCode(201)
  follow(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.followsService.follow(userId, user.sub);
  }

  @Delete('follows/:userId')
  @HttpCode(204)
  unfollow(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.followsService.unfollow(userId, user.sub);
  }

  @Get('users/:id/followers')
  getFollowers(@Param('id') id: string) {
    return this.followsService.getFollowers(id);
  }

  @Get('users/:id/following')
  getFollowing(@Param('id') id: string) {
    return this.followsService.getFollowing(id);
  }
}
