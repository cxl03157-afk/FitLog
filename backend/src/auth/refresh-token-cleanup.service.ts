import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  @Cron('0 3 * * *')
  async handleCleanup(): Promise<void> {
    const deleted = await this.refreshTokenService.deleteExpiredTokens();
    this.logger.log(
      JSON.stringify({
        event: 'refresh_token_cleanup',
        deletedCount: deleted,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
