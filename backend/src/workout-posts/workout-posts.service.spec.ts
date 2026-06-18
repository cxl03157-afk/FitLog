import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WorkoutPost } from './entities/workout-post.entity';
import { WorkoutPostsService } from './workout-posts.service';

const RAW_DEFAULT = { likecount: '0', commentcount: '0', isliked: false };

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
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let mockQb: {
    leftJoinAndSelect: jest.Mock;
    addSelect: jest.Mock;
    setParameter: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    innerJoin: jest.Mock;
    getCount: jest.Mock;
    getRawAndEntities: jest.Mock;
  };

  beforeEach(async () => {
    mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawAndEntities: jest.fn(),
    };

    repository = {
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
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

  describe('findAll', () => {
    it('returns posts with computed fields as numbers', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [{ likecount: '3', commentcount: '2', isliked: true }],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.total).toBe(1);
      expect(result.data[0].likeCount).toBe(3);
      expect(result.data[0].commentCount).toBe(2);
      expect(result.data[0].isLiked).toBe(true);
    });

    it('sets isLiked false when string "false"', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [{ likecount: '0', commentcount: '0', isliked: 'false' }],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].isLiked).toBe(false);
    });

    it('sets isLiked true when string "t"', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [{ likecount: '1', commentcount: '0', isliked: 't' }],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].isLiked).toBe(true);
    });
  });

  describe('findOne', () => {
    it('returns post with computed fields', async () => {
      const post = mockPost();
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [RAW_DEFAULT],
      });

      const result = await service.findOne('10', '1');

      expect(result).toEqual(expect.objectContaining({ id: '10' }));
      expect(result.likeCount).toBe(0);
      expect(result.commentCount).toBe(0);
      expect(result.isLiked).toBe(false);
    });

    it('throws NotFoundException when post not found', async () => {
      mockQb.getRawAndEntities.mockResolvedValue({ entities: [], raw: [] });

      await expect(service.findOne('999', '1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when updating another user post', async () => {
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [mockPost('2')],
        raw: [RAW_DEFAULT],
      });

      await expect(
        service.update('10', { title: 'updated' }, '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates post when owner', async () => {
      const post = mockPost('1');
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [RAW_DEFAULT],
      });
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
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [mockPost('2')],
        raw: [RAW_DEFAULT],
      });

      await expect(service.remove('10', '1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes post when owner', async () => {
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [mockPost('1')],
        raw: [RAW_DEFAULT],
      });
      repository.delete.mockResolvedValue(undefined);

      await service.remove('10', '1');

      expect(repository.delete).toHaveBeenCalledWith('10');
    });
  });
});
