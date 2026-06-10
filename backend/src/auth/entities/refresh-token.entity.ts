import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user_id', ['userId'])
@Index('idx_refresh_tokens_token_hash', ['tokenHash'])
@Index('idx_refresh_tokens_user_revoked_expires', [
  'userId',
  'revokedAt',
  'expiresAt',
])
@Index('idx_refresh_tokens_session_revoked', ['sessionId', 'revokedAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 100, name: 'device_name', nullable: true })
  deviceName: string | null;

  @Column({ type: 'text', name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'varchar', length: 45, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'timestamp', name: 'last_used_at' })
  lastUsedAt: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'bigint', name: 'replaced_by_token_id', nullable: true })
  replacedByTokenId: string | null;

  @ManyToOne(() => RefreshToken, { nullable: true })
  @JoinColumn({ name: 'replaced_by_token_id' })
  replacedByToken: RefreshToken | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
