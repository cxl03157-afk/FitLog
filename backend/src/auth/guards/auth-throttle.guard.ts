import { createHmac } from 'crypto';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';

const REFRESH_COOKIE = 'refresh_token';

@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  protected getTracker(req: Request): Promise<string> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const body = req.body as { email?: string };

    let identifier: string;
    if (typeof body.email === 'string') {
      // login: IP + email でアカウント単位の制限
      identifier = body.email;
    } else {
      // refresh: HMAC-SHA256(JWT_SECRET, rawToken) をセッション識別子として使用
      // 生値をキーに含めず、かつデバイス単位で独立したレート制限バケットを確保する
      const cookies = req.cookies as Record<string, unknown>;
      const rawToken = cookies[REFRESH_COOKIE];
      if (typeof rawToken === 'string') {
        const secret =
          this.configService.get<string>('JWT_SECRET') ?? 'fallback';
        const hashed = createHmac('sha256', secret)
          .update(rawToken)
          .digest('hex');
        identifier = `session:${hashed}`;
      } else {
        identifier = `ip-only:${ip}`;
      }
    }

    return Promise.resolve(`${ip}:${identifier}`);
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    await super.throwThrottlingException(_context, _throttlerLimitDetail);
  }
}
