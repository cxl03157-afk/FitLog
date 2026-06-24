import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('workout-posts/:postId/comments')
  @ApiOperation({ summary: '投稿のコメント一覧取得' })
  @ApiParam({ name: 'postId', description: 'トレーニング投稿 ID' })
  @ApiOkResponse({ description: 'Comment entity[]（user リレーション含む）' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findByPost(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Post('workout-posts/:postId/comments')
  @ApiOperation({ summary: '投稿にコメントを追加' })
  @ApiParam({ name: 'postId', description: 'トレーニング投稿 ID' })
  @ApiCreatedResponse({
    description: '作成された Comment entity（user リレーション含む）',
  })
  @ApiNotFoundResponse({ description: '投稿が存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.create(postId, dto, user.sub);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'コメント削除（所有者のみ）' })
  @ApiParam({ name: 'id', description: 'コメント ID' })
  @ApiNoContentResponse({ description: '削除成功' })
  @ApiNotFoundResponse({ description: 'コメントが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.commentsService.remove(id, user.sub);
  }
}
