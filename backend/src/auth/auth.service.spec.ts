import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuditLoggerService } from '../common/logger/audit-logger.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            create: jest.fn(),
            findValidByRawToken: jest.fn(),
            findByRawToken: jest.fn(),
            rotate: jest.fn(),
            revokeBySessionId: jest.fn(),
            revokeAllExceptSession: jest.fn(),
            revokeAllForUser: jest.fn(),
            getActiveSessions: jest.fn(),
            isReplayAttempt: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('access-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'NODE_ENV' ? 'development' : undefined,
            ),
          },
        },
        {
          provide: AuditLoggerService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'missing@example.com', password: 'password123' },
          'test-agent',
          '127.0.0.1',
          mockResponse,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
