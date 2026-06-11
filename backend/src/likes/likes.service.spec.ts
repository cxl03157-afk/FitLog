import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { Like } from './entities/like.entity';
import { LikesService } from './likes.service';

describe('LikesService', () => {
  let service: LikesService;
  let likeRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  let postRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    likeRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };
    postRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        { provide: getRepositoryToken(Like), useValue: likeRepo },
        { provide: getRepositoryToken(WorkoutPost), useValue: postRepo },
      ],
    }).compile();

    service = module.get(LikesService);
  });

  describe('add', () => {
    it('throws NotFoundException when post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.add('999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException on duplicate like', async () => {
      postRepo.findOne.mockResolvedValue({ id: '1' });
      likeRepo.create.mockReturnValue({});
      const err = new QueryFailedError('', [], new Error());
      Object.assign(err, { code: '23505' });
      likeRepo.save.mockRejectedValue(err);

      await expect(service.add('1', 'user1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates like successfully', async () => {
      const like = { id: '1', workoutPostId: '1', userId: 'user1' };
      postRepo.findOne.mockResolvedValue({ id: '1' });
      likeRepo.create.mockReturnValue(like);
      likeRepo.save.mockResolvedValue(like);

      const result = await service.add('1', 'user1');

      expect(result).toEqual(like);
    });
  });

  describe('count', () => {
    it('returns like count for post', async () => {
      postRepo.findOne.mockResolvedValue({ id: '1' });
      likeRepo.count.mockResolvedValue(5);

      const result = await service.count('1');

      expect(result).toEqual({ count: 5 });
    });
  });
});
