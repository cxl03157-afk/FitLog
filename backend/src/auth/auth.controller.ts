import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OriginRefererGuard } from '../common/guards/origin-referer.guard';
import { REFRESH_COOKIE_NAME } from '../common/constants/auth.constants';
import { RegisterDto } from '../users/dto/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthThrottleGuard } from './guards/auth-throttle.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const AUTH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    accessToken: { type: 'string', description: 'JWT アクセストークン' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        displayName: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
  },
} as const;

const SESSION_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', format: 'uuid' },
    deviceName: { type: 'string', nullable: true },
    userAgent: { type: 'string' },
    ipAddress: { type: 'string' },
    lastUsedAt: { type: 'string', format: 'date-time' },
    isCurrent: { type: 'boolean', description: '現在のセッションかどうか' },
  },
} as const;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(200)
  @ApiOperation({ summary: 'ユーザー登録' })
  @ApiOkResponse({
    description: '登録成功。RefreshToken を HttpOnly Cookie にセット',
    schema: AUTH_RESPONSE_SCHEMA,
  })
  register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(
      dto,
      req.headers['user-agent'] ?? 'unknown',
      req.ip ?? 'unknown',
      res,
    );
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'ログイン（レート制限: 10回/分）' })
  @ApiOkResponse({
    description: 'ログイン成功。RefreshToken を HttpOnly Cookie にセット',
    schema: AUTH_RESPONSE_SCHEMA,
  })
  @ApiUnauthorizedResponse({
    description: 'メールアドレスまたはパスワードが正しくない',
  })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(
      dto,
      req.headers['user-agent'] ?? 'unknown',
      req.ip ?? 'unknown',
      res,
    );
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(OriginRefererGuard, AuthThrottleGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary:
      'アクセストークンをリフレッシュ。HttpOnly Cookie の RefreshToken を使用してローテーション（レート制限: 20回/分）',
  })
  @ApiOkResponse({
    description:
      'リフレッシュ成功。新しい RefreshToken を HttpOnly Cookie にセット',
    schema: AUTH_RESPONSE_SCHEMA,
  })
  @ApiUnauthorizedResponse({
    description: 'RefreshToken が無効または存在しない',
  })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    return this.authService.refresh(
      rawToken,
      req.headers['user-agent'] ?? 'unknown',
      req.ip ?? 'unknown',
      res,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ログアウト（現在のセッションを失効）' })
  @ApiCreatedResponse({ description: 'ログアウト成功（void）' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    return this.authService.logout(user, rawToken, res);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'アクティブセッション一覧取得' })
  @ApiOkResponse({
    description: 'セッション一覧',
    schema: { type: 'array', items: SESSION_ITEM_SCHEMA },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  getSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getSessions(user);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '指定セッションを失効' })
  @ApiParam({
    name: 'sessionId',
    description: '失効させるセッション ID（UUID）',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'セッション失効成功' })
  @ApiNotFoundResponse({ description: 'セッションが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(user, sessionId);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '現在のセッション以外の全セッションを失効' })
  @ApiOkResponse({
    description: '失効したセッション数',
    schema: { type: 'number', example: 2 },
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  revokeAllOtherSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.revokeAllOtherSessions(user);
  }
}
