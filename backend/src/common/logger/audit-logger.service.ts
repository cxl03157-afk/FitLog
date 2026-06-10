import { Injectable, Logger } from '@nestjs/common';
import { maskSensitiveData } from '../utils/mask.util';

export type AuditEvent =
  | 'login_success'
  | 'login_failure'
  | 'register_success'
  | 'token_refresh'
  | 'token_refresh_failure'
  | 'logout'
  | 'session_revoke'
  | 'all_sessions_revoke'
  | 'replay_detected';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger('Audit');

  log(event: AuditEvent, context: Record<string, unknown>): void {
    const payload = maskSensitiveData({
      event,
      timestamp: new Date().toISOString(),
      ...context,
    });
    this.logger.log(JSON.stringify(payload));
  }
}
