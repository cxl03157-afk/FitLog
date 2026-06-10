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

    if (!allowedOrigin) {
      return true;
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
