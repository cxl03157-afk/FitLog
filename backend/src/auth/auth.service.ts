import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from '../common/constants/auth.constants';
import { AuditLoggerService } from '../common/logger/audit-logger.service';
import { RegisterDto } from '../users/dto/register.dto';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenService } from './refresh-token.service';

export interface AuthTokensResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
  };
}

export interface SessionInfo {
  sessionId: string;
  deviceName: string | null;
  userAgent: string;
  ipAddress: string;
  lastUsedAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async register(
    dto: RegisterDto,
    userAgent: string,
    ipAddress: string,
    res: Response,
  ): Promise<AuthTokensResponse> {
    const user = await this.usersService.create(dto);
    const result = await this.issueTokens(user, userAgent, ipAddress, res);

    this.auditLogger.log('register_success', {
      userId: user.id,
      email: user.email,
      ipAddress,
    });

    return result;
  }

  async login(
    dto: LoginDto,
    userAgent: string,
    ipAddress: string,
    res: Response,
  ): Promise<AuthTokensResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      this.auditLogger.log('login_failure', {
        email: dto.email,
        ipAddress,
        reason: 'user_not_found',
      });
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.auditLogger.log('login_failure', {
        email: dto.email,
        ipAddress,
        reason: 'invalid_password',
      });
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    }

    const result = await this.issueTokens(user, userAgent, ipAddress, res);

    this.auditLogger.log('login_success', {
      userId: user.id,
      email: user.email,
      ipAddress,
    });

    return result;
  }

  async refresh(
    rawRefreshToken: string | undefined,
    userAgent: string,
    ipAddress: string,
    res: Response,
  ): Promise<AuthTokensResponse> {
    if (!rawRefreshToken) {
      this.auditLogger.log('token_refresh_failure', {
        ipAddress,
        reason: 'missing_cookie',
      });
      throw new UnauthorizedException('Refresh token not found');
    }

    const token =
      await this.refreshTokenService.findValidByRawToken(rawRefreshToken);

    if (!token) {
      const revokedToken =
        await this.refreshTokenService.findByRawToken(rawRefreshToken);
      if (
        revokedToken &&
        this.refreshTokenService.isReplayAttempt(revokedToken)
      ) {
        await this.refreshTokenService.revokeAllForUser(revokedToken.userId);
        this.auditLogger.log('replay_detected', {
          userId: revokedToken.userId,
          sessionId: revokedToken.sessionId,
          ipAddress,
        });
        this.clearRefreshCookie(res);
        throw new UnauthorizedException('Replay attack detected');
      }

      this.auditLogger.log('token_refresh_failure', {
        ipAddress,
        reason: 'invalid_token',
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(token.userId);
    const { rawToken, entity } = await this.refreshTokenService.rotate(token, {
      userId: user.id,
      userAgent,
      ipAddress,
    });

    const accessToken = this.generateAccessToken(user, entity.sessionId);
    this.setRefreshCookie(res, rawToken);

    this.auditLogger.log('token_refresh', {
      userId: user.id,
      sessionId: entity.sessionId,
      ipAddress,
    });

    return {
      accessToken,
      user: this.toUserResponse(user),
    };
  }

  async logout(
    currentUser: JwtPayload,
    rawRefreshToken: string | undefined,
    res: Response,
  ): Promise<void> {
    if (rawRefreshToken) {
      const token =
        await this.refreshTokenService.findValidByRawToken(rawRefreshToken);
      if (token) {
        await this.refreshTokenService.revokeBySessionId(token.sessionId);
      }
    } else {
      await this.refreshTokenService.revokeBySessionId(currentUser.sessionId);
    }

    this.clearRefreshCookie(res);

    this.auditLogger.log('logout', {
      userId: currentUser.sub,
      sessionId: currentUser.sessionId,
    });
  }

  async getSessions(currentUser: JwtPayload): Promise<SessionInfo[]> {
    const sessions = await this.refreshTokenService.getActiveSessions(
      currentUser.sub,
    );

    return sessions.map((session) => ({
      sessionId: session.sessionId,
      deviceName: session.deviceName,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      isCurrent: session.sessionId === currentUser.sessionId,
    }));
  }

  async revokeSession(
    currentUser: JwtPayload,
    sessionId: string,
  ): Promise<void> {
    const sessions = await this.refreshTokenService.getActiveSessions(
      currentUser.sub,
    );
    const target = sessions.find((s) => s.sessionId === sessionId);

    if (!target) {
      throw new NotFoundException('Session not found');
    }

    await this.refreshTokenService.revokeBySessionId(sessionId);

    this.auditLogger.log('session_revoke', {
      userId: currentUser.sub,
      sessionId,
    });
  }

  async revokeAllOtherSessions(currentUser: JwtPayload): Promise<number> {
    const count = await this.refreshTokenService.revokeAllExceptSession(
      currentUser.sub,
      currentUser.sessionId,
    );

    this.auditLogger.log('all_sessions_revoke', {
      userId: currentUser.sub,
      currentSessionId: currentUser.sessionId,
      revokedCount: count,
    });

    return count;
  }

  private async issueTokens(
    user: User,
    userAgent: string,
    ipAddress: string,
    res: Response,
  ): Promise<AuthTokensResponse> {
    const sessionId = randomUUID();
    const { rawToken } = await this.refreshTokenService.create({
      userId: user.id,
      sessionId,
      userAgent,
      ipAddress,
    });

    const accessToken = this.generateAccessToken(user, sessionId);
    this.setRefreshCookie(res, rawToken);

    return {
      accessToken,
      user: this.toUserResponse(user),
    };
  }

  private generateAccessToken(user: User, sessionId: string): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
    };

    return this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  private setRefreshCookie(res: Response, rawToken: string): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(REFRESH_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }

  private toUserResponse(user: User): AuthTokensResponse['user'] {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
    };
  }
}
