import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Follow } from './entities/follow.entity';
import { FollowsService } from './follows.service';

describe('FollowsService', () => {
  let service: FollowsService;
  let followRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };
  let usersService: { findById: jest.Mock };

  beforeEach(async () => {
    followRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };
    usersService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        { provide: getRepositoryToken(Follow), useValue: followRepo },
        { provide: UsersService, useValue: usersService },
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
});
