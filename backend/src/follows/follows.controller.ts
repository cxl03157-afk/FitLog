import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { FollowUserDto } from './dto/follow-user.dto';
import { FollowsService } from './follows.service';

@ApiTags('follows')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post('follows/:userId')
  @HttpCode(201)
  @ApiOperation({ summary: 'ユーザーをフォロー' })
  @ApiParam({ name: 'userId', description: 'フォロー対象のユーザー ID' })
  @ApiCreatedResponse({ description: 'フォロー成功' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  follow(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.followsService.follow(userId, user.sub);
  }

  @Delete('follows/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'フォロー解除' })
  @ApiParam({ name: 'userId', description: 'フォロー解除対象のユーザー ID' })
  @ApiNoContentResponse({ description: 'フォロー解除成功' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  unfollow(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.followsService.unfollow(userId, user.sub);
  }

  @Get('users/:id/followers')
  @ApiOperation({ summary: '指定ユーザーのフォロワー一覧取得' })
  @ApiParam({ name: 'id', description: 'ユーザー ID' })
  @ApiOkResponse({
    description: 'フォロワー一覧（isFollowing 含む）',
    type: [FollowUserDto],
  })
  @ApiNotFoundResponse({ description: '指定ユーザーが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  getFollowers(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.followsService.getFollowers(id, user.sub);
  }

  @Get('users/:id/following')
  @ApiOperation({ summary: '指定ユーザーのフォロー中一覧取得' })
  @ApiParam({ name: 'id', description: 'ユーザー ID' })
  @ApiOkResponse({
    description: 'フォロー中一覧（isFollowing 含む）',
    type: [FollowUserDto],
  })
  @ApiNotFoundResponse({ description: '指定ユーザーが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  getFollowing(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.followsService.getFollowing(id, user.sub);
  }
}
