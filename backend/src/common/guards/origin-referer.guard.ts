import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class OriginRefererGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allowedOrigin = this.configService.get<string>('FRONTEND_ORIGIN');
    const isDev = this.configService.get<string>('NODE_ENV') === 'development';

    if (!allowedOrigin) {
      // 開発環境のみフェイルオープン許容。それ以外は拒否
      if (isDev) return true;
      throw new ForbiddenException('FRONTEND_ORIGIN is not configured');
    }

    const origin = request.headers.origin;
    const referer = request.headers.referer;

    const isValidOrigin = origin === allowedOrigin;
    const isValidReferer =
      referer !== undefined && referer.startsWith(allowedOrigin);

    if (!isValidOrigin && !isValidReferer) {
      throw new ForbiddenException('Invalid origin');
    }

    return true;
  }
}
