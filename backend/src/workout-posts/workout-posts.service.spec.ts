import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WorkoutPost } from './entities/workout-post.entity';
import { WorkoutPostsService } from './workout-posts.service';

const mockPost = (userId = '1') =>
  ({
    id: '10',
    userId,
    title: '胸の日',
    note: null,
    trainedOn: '2026-06-01',
    createdAt: new Date(),
    updatedAt: null,
    workoutExercises: [],
    user: { id: userId },
  }) as unknown as WorkoutPost;

describe('WorkoutPostsService', () => {
  let service: WorkoutPostsService;
  let repository: {
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutPostsService,
        { provide: getRepositoryToken(WorkoutPost), useValue: repository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(WorkoutPostsService);
  });

  describe('findOne', () => {
    it('returns post when found', async () => {
      const post = mockPost();
      repository.findOne.mockResolvedValue(post);

      const result = await service.findOne('10');

      expect(result).toEqual(post);
    });

    it('throws NotFoundException when post not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when updating another user post', async () => {
      repository.findOne.mockResolvedValue(mockPost('2'));

      await expect(
        service.update('10', { title: 'updated' }, '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates post when owner', async () => {
      const post = mockPost('1');
      repository.findOne.mockResolvedValue(post);
      repository.update.mockResolvedValue(undefined);

      await service.update('10', { title: 'updated' }, '1');

      expect(repository.update).toHaveBeenCalledWith(
        '10',
        expect.objectContaining({ title: 'updated' }),
      );
      const payload = (
        repository.update.mock.calls[0] as [string, { updatedAt: unknown }]
      )[1];
      expect(payload.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when deleting another user post', async () => {
      repository.findOne.mockResolvedValue(mockPost('2'));

      await expect(service.remove('10', '1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes post when owner', async () => {
      repository.findOne.mockResolvedValue(mockPost('1'));
      repository.delete.mockResolvedValue(undefined);

      await service.remove('10', '1');

      expect(repository.delete).toHaveBeenCalledWith('10');
    });
  });
});
