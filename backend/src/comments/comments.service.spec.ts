import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { Comment } from './entities/comment.entity';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let postRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    commentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    postRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: commentRepo },
        { provide: getRepositoryToken(WorkoutPost), useValue: postRepo },
      ],
    }).compile();

    service = module.get(CommentsService);
  });

  describe('findByPost', () => {
    it('throws NotFoundException when post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.findByPost('999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns comments for post', async () => {
      postRepo.findOne.mockResolvedValue({ id: '1' });
      commentRepo.find.mockResolvedValue([{ id: '1', content: 'nice' }]);

      const result = await service.findByPost('1');

      expect(result).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when comment not found', async () => {
      commentRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when neither comment owner nor post owner', async () => {
      commentRepo.findOne.mockResolvedValue({
        id: '1',
        userId: 'user2',
        workoutPost: { userId: 'user3' },
      });

      await expect(service.remove('1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes comment when comment owner', async () => {
      commentRepo.findOne.mockResolvedValue({
        id: '1',
        userId: 'user1',
        workoutPost: { userId: 'user2' },
      });
      commentRepo.delete.mockResolvedValue(undefined);

      await service.remove('1', 'user1');

      expect(commentRepo.delete).toHaveBeenCalledWith('1');
    });

    it('deletes comment when post owner', async () => {
      commentRepo.findOne.mockResolvedValue({
        id: '1',
        userId: 'user2',
        workoutPost: { userId: 'user1' },
      });
      commentRepo.delete.mockResolvedValue(undefined);

      await service.remove('1', 'user1');

      expect(commentRepo.delete).toHaveBeenCalledWith('1');
    });
  });
});
