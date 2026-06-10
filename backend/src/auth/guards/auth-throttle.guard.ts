import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const body = req.body as { email?: string };
    // /refresh has no email in body — use endpoint path as identifier
    const identifier =
      typeof body.email === 'string' ? body.email : `path:${req.path}`;
    return Promise.resolve(`${ip}:${identifier}`);
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    await super.throwThrottlingException(_context, _throttlerLimitDetail);
  }
}
