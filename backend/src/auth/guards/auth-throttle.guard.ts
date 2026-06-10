import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';
import { RefreshTokenService } from '../refresh-token.service';

const REFRESH_COOKIE = 'refresh_token';

@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
  @Inject(RefreshTokenService)
  private readonly refreshTokenService: RefreshTokenService;

  protected async getTracker(req: Request): Promise<string> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const body = req.body as { email?: string };

    if (typeof body.email === 'string') {
      // login: IP + email でアカウント単位の制限
      return `${ip}:${body.email}`;
    }

    // refresh: DB から sessionId を取得してセッション単位の制限を実施
    // sessionId はトークンローテーション後も同一値が引き継がれるため安定したキーになる
    const cookies = req.cookies as Record<string, unknown>;
    const rawToken = cookies[REFRESH_COOKIE];
    if (typeof rawToken === 'string') {
      const token = await this.refreshTokenService.findByRawToken(rawToken);
      if (token) {
        return `${ip}:session:${token.sessionId}`;
      }
    }

    return `${ip}:anonymous`;
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    await super.throwThrottlingException(_context, _throttlerLimitDetail);
  }
}
