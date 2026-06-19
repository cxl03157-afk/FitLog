import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Service } from '../s3/s3.service';
import { UsersService } from './users.service';
import { User } from './user.entity';

const mockUser = (overrides?: Partial<User>): User => ({
  id: '1',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed',
  avatarKey: null,
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockFile = (): Express.Multer.File =>
  ({
    fieldname: 'avatar',
    originalname: 'avatar.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('data'),
  }) as Express.Multer.File;

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<
    Pick<Repository<User>, 'findOne' | 'create' | 'save' | 'update'>
  >;
  let s3Service: { upload: jest.Mock; deleteOne: jest.Mock };
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    s3Service = { upload: jest.fn(), deleteOne: jest.fn() };
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: S3Service, useValue: s3Service },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:4566/fitlog'),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('create', () => {
    it('throws ConflictException when username exists', async () => {
      (repository.findOne as jest.Mock).mockResolvedValueOnce({
        id: '1',
      });

      await expect(
        service.create({
          username: 'taken',
          displayName: 'Test',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when email exists', async () => {
      (repository.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: '1' });

      await expect(
        service.create({
          username: 'newuser',
          displayName: 'Test',
          email: 'taken@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('uploadAvatar', () => {
    it('uploads avatar and returns avatarKey and avatarUrl', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser());
      s3Service.upload.mockResolvedValue(undefined);
      (repository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadAvatar('1', mockFile());

      expect(s3Service.upload).toHaveBeenCalledTimes(1);
      const [calledId, calledData] = (repository.update as jest.Mock).mock
        .calls[0] as [string, { avatarKey: string }];
      expect(calledId).toBe('1');
      expect(calledData.avatarKey).toMatch(/^images\/avatars\/1\/.+\.jpg$/);
      expect(result.avatarKey).toMatch(/^images\/avatars\/1\/.+\.jpg$/);
      expect(result.avatarUrl).toContain(result.avatarKey);
    });

    it('throws NotFoundException when user not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.uploadAvatar('999', mockFile())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rolls back new avatarKey when DB update fails', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser());
      s3Service.upload.mockResolvedValue(undefined);
      (repository.update as jest.Mock).mockRejectedValue(new Error('DB error'));
      s3Service.deleteOne.mockResolvedValue(undefined);

      await expect(service.uploadAvatar('1', mockFile())).rejects.toThrow(
        'DB error',
      );

      expect(s3Service.deleteOne).toHaveBeenCalledWith(
        expect.stringMatching(/^images\/avatars\/1\/.+\.jpg$/),
      );
    });

    it('rethrows original error even when rollback deleteOne fails', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser());
      s3Service.upload.mockResolvedValue(undefined);
      (repository.update as jest.Mock).mockRejectedValue(new Error('DB error'));
      s3Service.deleteOne.mockRejectedValue(new Error('rollback failed'));

      await expect(service.uploadAvatar('1', mockFile())).rejects.toThrow(
        'DB error',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'S3 rollback failed after avatar DB update error',
        expect.any(Error),
      );
    });

    it('deletes old avatar after successful DB update', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(
        mockUser({ avatarKey: 'images/avatars/1/old.jpg' }),
      );
      s3Service.upload.mockResolvedValue(undefined);
      (repository.update as jest.Mock).mockResolvedValue(undefined);
      s3Service.deleteOne.mockResolvedValue(undefined);

      await service.uploadAvatar('1', mockFile());

      expect(s3Service.deleteOne).toHaveBeenCalledWith(
        'images/avatars/1/old.jpg',
      );
    });

    it('maintains DB update result when old avatar deletion fails', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(
        mockUser({ avatarKey: 'images/avatars/1/old.jpg' }),
      );
      s3Service.upload.mockResolvedValue(undefined);
      (repository.update as jest.Mock).mockResolvedValue(undefined);
      s3Service.deleteOne.mockRejectedValue(new Error('S3 error'));

      const result = await service.uploadAvatar('1', mockFile());

      expect(result.avatarKey).toMatch(/^images\/avatars\/1\/.+\.jpg$/);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to delete old avatar key: images/avatars/1/old.jpg',
        expect.any(Error),
      );
    });
  });
});
