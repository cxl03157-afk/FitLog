import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
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
  @UseGuards(AuthThrottleGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @UseGuards(OriginRefererGuard, AuthThrottleGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
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
  getSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getSessions(user);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(user, sessionId);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  revokeAllOtherSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.revokeAllOtherSessions(user);
  }
}
