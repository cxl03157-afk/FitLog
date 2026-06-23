import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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

const mockQb = () => {
  const qb = {} as jest.Mocked<SelectQueryBuilder<User>>;
  const chain = (): jest.Mocked<SelectQueryBuilder<User>> => qb;
  qb.select = jest.fn(chain);
  qb.addSelect = jest.fn(chain);
  qb.where = jest.fn(chain);
  qb.setParameter = jest.fn(chain);
  qb.orderBy = jest.fn(chain);
  qb.limit = jest.fn(chain);
  qb.getRawOne = jest.fn();
  qb.getRawMany = jest.fn();
  return qb;
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<
    Pick<
      Repository<User>,
      'findOne' | 'create' | 'save' | 'update' | 'createQueryBuilder'
    >
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
            createQueryBuilder: jest.fn(),
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

  describe('getProfile', () => {
    const profileRow = {
      id: '2',
      username: 'alice',
      displayName: 'Alice',
      bio: 'hello',
      avatarKey: 'images/avatars/2/abc.jpg',
      postCount: 3,
      followerCount: 5,
      followingCount: 2,
      isFollowingRaw: true,
    };

    it('returns profile with avatarUrl and isFollowing=true for followed user', async () => {
      const qb = mockQb();
      qb.getRawOne.mockResolvedValue(profileRow);
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.getProfile('2', '1');

      expect(result.id).toBe('2');
      expect(result.avatarUrl).toBe(
        'http://localhost:4566/fitlog/images/avatars/2/abc.jpg',
      );
      expect(result.isFollowing).toBe(true);
      expect(result.postCount).toBe(3);
      expect(result.followerCount).toBe(5);
    });

    it('returns isFollowing=false when currentUser is the profile owner', async () => {
      const qb = mockQb();
      qb.getRawOne.mockResolvedValue({ ...profileRow, isFollowingRaw: true });
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.getProfile('2', '2');

      expect(result.isFollowing).toBe(false);
    });

    it('returns isFollowing=false when not following', async () => {
      const qb = mockQb();
      qb.getRawOne.mockResolvedValue({ ...profileRow, isFollowingRaw: false });
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.getProfile('2', '1');

      expect(result.isFollowing).toBe(false);
    });

    it('returns avatarUrl=null when avatarKey is null', async () => {
      const qb = mockQb();
      qb.getRawOne.mockResolvedValue({ ...profileRow, avatarKey: null });
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.getProfile('2', '1');

      expect(result.avatarUrl).toBeNull();
    });

    it('throws NotFoundException when user not found', async () => {
      const qb = mockQb();
      qb.getRawOne.mockResolvedValue(null);
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await expect(service.getProfile('999', '1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchUsers', () => {
    it('returns users with avatarUrl and isFollowing', async () => {
      const qb = mockQb();
      qb.getRawMany.mockResolvedValue([
        {
          id: '2',
          username: 'alice',
          displayName: 'Alice',
          avatarKey: 'images/avatars/2/abc.jpg',
          isFollowing: true,
        },
      ]);
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.searchUsers(
        { username: 'ali', limit: 20 },
        '1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].avatarUrl).toContain('images/avatars/2/abc.jpg');
      expect(result[0].isFollowing).toBe(true);
    });

    it('returns avatarUrl=null when avatarKey is null', async () => {
      const qb = mockQb();
      qb.getRawMany.mockResolvedValue([
        {
          id: '3',
          username: 'bob',
          displayName: 'Bob',
          avatarKey: null,
          isFollowing: false,
        },
      ]);
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.searchUsers({ username: 'bob' }, '1');

      expect(result[0].avatarUrl).toBeNull();
    });

    it('returns empty array when no users match', async () => {
      const qb = mockQb();
      qb.getRawMany.mockResolvedValue([]);
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.searchUsers({ username: 'zzz' }, '1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateProfile', () => {
    it('updates displayName only', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(
        mockUser({ displayName: 'New Name' }),
      );
      (repository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updateProfile('1', {
        displayName: 'New Name',
      });

      expect(repository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ displayName: 'New Name' }),
      );
      expect(result.displayName).toBe('New Name');
    });

    it('updates bio to null when null is provided', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(
        mockUser({ bio: null }),
      );
      (repository.update as jest.Mock).mockResolvedValue(undefined);

      await service.updateProfile('1', { bio: null });

      expect(repository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ bio: null }),
      );
    });

    it('does not call update when empty DTO is provided', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser());

      await service.updateProfile('1', {});

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns avatarUrl built from avatarKey', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(
        mockUser({ avatarKey: 'images/avatars/1/abc.jpg' }),
      );
      (repository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updateProfile('1', { displayName: 'X' });

      expect(result.avatarUrl).toBe(
        'http://localhost:4566/fitlog/images/avatars/1/abc.jpg',
      );
    });
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
