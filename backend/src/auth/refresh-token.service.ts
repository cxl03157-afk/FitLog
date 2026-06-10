import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import {
  REFRESH_TOKEN_EXPIRES_DAYS,
  TOKEN_RETENTION_DAYS,
} from '../common/constants/auth.constants';
import { generateRefreshToken, hashToken } from '../common/utils/crypto.util';
import { RefreshToken } from './entities/refresh-token.entity';

export interface CreateRefreshTokenParams {
  userId: string;
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  deviceName?: string;
}

export interface RefreshTokenResult {
  rawToken: string;
  entity: RefreshToken;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async create(params: CreateRefreshTokenParams): Promise<RefreshTokenResult> {
    const rawToken = generateRefreshToken();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    const entity = this.refreshTokenRepository.create({
      userId: params.userId,
      tokenHash: hashToken(rawToken),
      sessionId: params.sessionId,
      deviceName: params.deviceName ?? null,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      lastUsedAt: now,
      expiresAt,
    });

    const saved = await this.refreshTokenRepository.save(entity);
    return { rawToken, entity: saved };
  }

  async findByRawToken(rawToken: string): Promise<RefreshToken | null> {
    const tokenHash = hashToken(rawToken);
    return this.refreshTokenRepository.findOne({ where: { tokenHash } });
  }

  async findValidByRawToken(rawToken: string): Promise<RefreshToken | null> {
    const token = await this.findByRawToken(rawToken);
    if (!token || token.revokedAt !== null || token.expiresAt <= new Date()) {
      return null;
    }
    return token;
  }

  async findById(id: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({ where: { id } });
  }

  async rotate(
    oldToken: RefreshToken,
    params: Omit<CreateRefreshTokenParams, 'sessionId'>,
  ): Promise<RefreshTokenResult> {
    // Revoke old token first so the partial UNIQUE index (session_id WHERE revoked_at IS NULL)
    // allows inserting a new active token for the same session.
    oldToken.revokedAt = new Date();
    oldToken.lastUsedAt = new Date();
    await this.refreshTokenRepository.save(oldToken);

    const { rawToken, entity: newEntity } = await this.create({
      ...params,
      sessionId: oldToken.sessionId,
    });

    oldToken.replacedByTokenId = newEntity.id;
    await this.refreshTokenRepository.save(oldToken);

    return { rawToken, entity: newEntity };
  }

  async revokeBySessionId(sessionId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { sessionId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllExceptSession(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('session_id != :currentSessionId', { currentSessionId })
      .andWhere('revoked_at IS NULL')
      .execute();

    return result.affected ?? 0;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    const now = new Date();
    return this.refreshTokenRepository.find({
      where: {
        userId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async deleteExpiredTokens(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TOKEN_RETENTION_DAYS);

    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('revoked_at IS NOT NULL AND revoked_at < :cutoff', { cutoff })
      .orWhere('expires_at < :cutoff', { cutoff })
      .execute();

    return result.affected ?? 0;
  }

  isReplayAttempt(token: RefreshToken): boolean {
    return token.revokedAt !== null && token.replacedByTokenId !== null;
  }
}
