import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, SelectQueryBuilder } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Follow } from './entities/follow.entity';
import { FollowsService } from './follows.service';

const mockFollowQb = () => {
  const stubs = {
    innerJoin: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    setParameter: jest.fn(),
    orderBy: jest.fn(),
    getRawMany: jest.fn(),
  };
  const qb = stubs as unknown as jest.Mocked<SelectQueryBuilder<Follow>>;
  stubs.innerJoin.mockReturnValue(qb);
  stubs.select.mockReturnValue(qb);
  stubs.addSelect.mockReturnValue(qb);
  stubs.where.mockReturnValue(qb);
  stubs.setParameter.mockReturnValue(qb);
  stubs.orderBy.mockReturnValue(qb);
  return qb;
};

describe('FollowsService', () => {
  let service: FollowsService;
  let followRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let usersService: { findById: jest.Mock };

  beforeEach(async () => {
    followRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    usersService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        { provide: getRepositoryToken(Follow), useValue: followRepo },
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:4566/fitlog'),
          },
        },
      ],
    }).compile();

    service = module.get(FollowsService);
  });

  describe('follow', () => {
    it('throws BadRequestException when following self', async () => {
      await expect(service.follow('user1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException on duplicate follow', async () => {
      usersService.findById.mockResolvedValue({ id: 'user2' });
      followRepo.create.mockReturnValue({});
      const err = new QueryFailedError('', [], new Error());
      Object.assign(err, { code: '23505' });
      followRepo.save.mockRejectedValue(err);

      await expect(service.follow('user2', 'user1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates follow relationship successfully', async () => {
      const follow = { id: '1', followerId: 'user1', followeeId: 'user2' };
      usersService.findById.mockResolvedValue({ id: 'user2' });
      followRepo.create.mockReturnValue(follow);
      followRepo.save.mockResolvedValue(follow);

      const result = await service.follow('user2', 'user1');

      expect(result).toEqual(follow);
    });
  });

  describe('unfollow', () => {
    it('throws NotFoundException when follow not found', async () => {
      usersService.findById.mockResolvedValue({ id: 'user2' });
      followRepo.findOne.mockResolvedValue(null);

      await expect(service.unfollow('user2', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFollowers', () => {
    it('returns followers with avatarUrl and isFollowing', async () => {
      usersService.findById.mockResolvedValue({ id: 'user2' });
      const qb = mockFollowQb();
      qb.getRawMany.mockResolvedValue([
        {
          id: 'user1',
          username: 'alice',
          displayName: 'Alice',
          avatarKey: 'images/avatars/user1/abc.jpg',
          isFollowing: true,
        },
      ]);
      followRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFollowers('user2', 'me');

      expect(result).toHaveLength(1);
      expect(result[0].avatarUrl).toContain('images/avatars/user1/abc.jpg');
      expect(result[0].isFollowing).toBe(true);
    });

    it('returns avatarUrl=null when avatarKey is null', async () => {
      usersService.findById.mockResolvedValue({ id: 'user2' });
      const qb = mockFollowQb();
      qb.getRawMany.mockResolvedValue([
        {
          id: 'user1',
          username: 'alice',
          displayName: 'Alice',
          avatarKey: null,
          isFollowing: false,
        },
      ]);
      followRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFollowers('user2', 'me');

      expect(result[0].avatarUrl).toBeNull();
    });

    it('returns empty array when user has no followers', async () => {
      usersService.findById.mockResolvedValue({ id: 'user2' });
      const qb = mockFollowQb();
      qb.getRawMany.mockResolvedValue([]);
      followRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFollowers('user2', 'me');

      expect(result).toHaveLength(0);
    });

    it('throws NotFoundException for non-existent user', async () => {
      usersService.findById.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.getFollowers('nonexistent', 'me')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('uses a single query (no N+1)', async () => {
      usersService.findById.mockResolvedValue({ id: 'user2' });
      const qb = mockFollowQb();
      qb.getRawMany.mockResolvedValue([]);
      followRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getFollowers('user2', 'me');

      expect(followRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFollowing', () => {
    it('returns following users with avatarUrl and isFollowing', async () => {
      usersService.findById.mockResolvedValue({ id: 'user1' });
      const qb = mockFollowQb();
      qb.getRawMany.mockResolvedValue([
        {
          id: 'user2',
          username: 'bob',
          displayName: 'Bob',
          avatarKey: null,
          isFollowing: false,
        },
      ]);
      followRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFollowing('user1', 'me');

      expect(result).toHaveLength(1);
      expect(result[0].isFollowing).toBe(false);
    });

    it('throws NotFoundException for non-existent user', async () => {
      usersService.findById.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.getFollowing('nonexistent', 'me')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
