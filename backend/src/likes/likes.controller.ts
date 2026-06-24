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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { LikesService } from './likes.service';

@ApiTags('likes')
@ApiBearerAuth()
@ApiParam({ name: 'postId', description: 'トレーニング投稿 ID' })
@Controller('workout-posts/:postId/likes')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Get('count')
  @ApiOperation({ summary: 'ナイス数を取得' })
  @ApiOkResponse({
    description: 'ナイス数',
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  count(@Param('postId') postId: string) {
    return this.likesService.count(postId);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'ナイスを追加（409: 既にナイス済み）' })
  @ApiCreatedResponse({ description: 'ナイス追加成功' })
  @ApiConflictResponse({ description: '既にナイス済み' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  add(@Param('postId') postId: string, @CurrentUser() user: JwtPayload) {
    return this.likesService.add(postId, user.sub);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'ナイスを取り消し' })
  @ApiNoContentResponse({ description: 'ナイス取り消し成功' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  remove(@Param('postId') postId: string, @CurrentUser() user: JwtPayload) {
    return this.likesService.remove(postId, user.sub);
  }
}
