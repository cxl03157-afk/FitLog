import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { S3Service } from '../s3/s3.service';
import { PostImage } from './entities/post-image.entity';
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
    postImages: [],
    user: { id: userId, avatarKey: null },
  }) as unknown as WorkoutPost;

const mockFile = (mimetype = 'image/jpeg', size = 1024): Express.Multer.File =>
  ({
    fieldname: 'images',
    originalname: 'test.jpg',
    mimetype,
    size,
    buffer: Buffer.from('data'),
  }) as Express.Multer.File;

describe('WorkoutPostsService', () => {
  let service: WorkoutPostsService;
  let repository: {
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let postImageRepository: {
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let s3Service: { upload: jest.Mock; deleteMany: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let mockQb: Record<string, jest.Mock>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
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
    postImageRepository = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    s3Service = {
      upload: jest.fn(),
      deleteMany: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutPostsService,
        { provide: getRepositoryToken(WorkoutPost), useValue: repository },
        {
          provide: getRepositoryToken(PostImage),
          useValue: postImageRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: S3Service, useValue: s3Service },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:4566/fitlog'),
          },
        },
      ],
    }).compile();

    service = module.get(WorkoutPostsService);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  const setFindOneMock = (post: WorkoutPost) => {
    mockQb.getRawAndEntities.mockResolvedValue({
      entities: [post],
      raw: [RAW_DEFAULT],
    });
  };

  describe('findAll', () => {
    it('returns posts with computed fields as numbers', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [
          { post_id: '10', likecount: '3', commentcount: '2', isliked: true },
        ],
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
        raw: [
          {
            post_id: '10',
            likecount: '0',
            commentcount: '0',
            isliked: 'false',
          },
        ],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].isLiked).toBe(false);
    });

    it('sets isLiked true when string "t"', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [
          { post_id: '10', likecount: '1', commentcount: '0', isliked: 't' },
        ],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].isLiked).toBe(true);
    });

    it('assigns raw counts by post id, not array position (regression: JOIN Cartesian expansion)', async () => {
      const postA = { ...mockPost(), id: '10' };
      const postB = { ...mockPost(), id: '20' };
      const postC = { ...mockPost(), id: '30' };

      mockQb.getCount.mockResolvedValue(3);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [postA, postB, postC],
        raw: [
          { post_id: '10', likecount: '0', commentcount: '0', isliked: false },
          { post_id: '20', likecount: '2', commentcount: '1', isliked: true },
          { post_id: '20', likecount: '2', commentcount: '1', isliked: true },
          { post_id: '20', likecount: '2', commentcount: '1', isliked: true },
          { post_id: '30', likecount: '4', commentcount: '3', isliked: false },
        ],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].likeCount).toBe(0);
      expect(result.data[0].commentCount).toBe(0);
      expect(result.data[0].isLiked).toBe(false);

      expect(result.data[1].likeCount).toBe(2);
      expect(result.data[1].commentCount).toBe(1);
      expect(result.data[1].isLiked).toBe(true);

      expect(result.data[2].likeCount).toBe(4);
      expect(result.data[2].commentCount).toBe(3);
      expect(result.data[2].isLiked).toBe(false);
    });

    it('uses 0/false defaults when entity has no matching raw row', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [
          { post_id: '99', likecount: '5', commentcount: '5', isliked: true },
        ],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].likeCount).toBe(0);
      expect(result.data[0].commentCount).toBe(0);
      expect(result.data[0].isLiked).toBe(false);
    });

    it('returns empty data when entities array is empty', async () => {
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getRawAndEntities.mockResolvedValue({ entities: [], raw: [] });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('uses only the first raw row per post when multiple raw rows share the same post_id', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [
          { post_id: '10', likecount: '3', commentcount: '2', isliked: true },
          { post_id: '10', likecount: '3', commentcount: '2', isliked: true },
        ],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].likeCount).toBe(3);
      expect(result.data[0].commentCount).toBe(2);
      expect(result.data[0].isLiked).toBe(true);
    });

    it('matches by post id when raw post_id is numeric (string/number type safety)', async () => {
      const post = mockPost();
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [
          { post_id: 10, likecount: '5', commentcount: '3', isliked: true },
        ],
      });

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].likeCount).toBe(5);
      expect(result.data[0].commentCount).toBe(3);
      expect(result.data[0].isLiked).toBe(true);
    });
  });

  describe('attachImageUrls (via findAll)', () => {
    const setupFindAll = (post: unknown) => {
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getRawAndEntities.mockResolvedValue({
        entities: [post],
        raw: [
          { post_id: '10', likecount: '0', commentcount: '0', isliked: false },
        ],
      });
    };

    it('sets avatarUrl from avatarKey when avatarKey is present', async () => {
      const post = {
        ...mockPost(),
        user: { id: '1', avatarKey: 'images/avatars/1/abc.jpg' },
      } as unknown as WorkoutPost;
      setupFindAll(post);

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect((result.data[0].user as Record<string, unknown>).avatarUrl).toBe(
        'http://localhost:4566/fitlog/images/avatars/1/abc.jpg',
      );
    });

    it('sets avatarUrl to null when avatarKey is null', async () => {
      const post = {
        ...mockPost(),
        user: { id: '1', avatarKey: null },
      } as unknown as WorkoutPost;
      setupFindAll(post);

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(
        (result.data[0].user as Record<string, unknown>).avatarUrl,
      ).toBeNull();
    });

    it('preserves post image URLs alongside avatarUrl computation', async () => {
      const post = {
        ...mockPost(),
        user: { id: '1', avatarKey: 'images/avatars/1/abc.jpg' },
        postImages: [
          { id: 'img1', imageKey: 'images/posts/10/xyz.jpg', displayOrder: 0 },
        ],
      } as unknown as WorkoutPost;
      setupFindAll(post);

      const result = await service.findAll({ page: 1, limit: 20 }, '1');

      expect(result.data[0].postImages[0].imageUrl).toBe(
        'http://localhost:4566/fitlog/images/posts/10/xyz.jpg',
      );
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
      setFindOneMock(mockPost('2'));

      await expect(
        service.update('10', { title: 'updated' }, '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates post when owner', async () => {
      setFindOneMock(mockPost('1'));
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
      setFindOneMock(mockPost('2'));

      await expect(service.remove('10', '1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes post when owner', async () => {
      setFindOneMock(mockPost('1'));
      postImageRepository.find.mockResolvedValue([]);
      repository.delete.mockResolvedValue(undefined);

      await service.remove('10', '1');

      expect(repository.delete).toHaveBeenCalledWith('10');
    });

    it('continues DB delete even when S3 delete fails', async () => {
      setFindOneMock(mockPost('1'));
      postImageRepository.find.mockResolvedValue([
        { imageKey: 'images/posts/10/a.jpg' },
      ]);
      s3Service.deleteMany.mockRejectedValue(new Error('S3 unreachable'));
      repository.delete.mockResolvedValue(undefined);

      await service.remove('10', '1');

      expect(repository.delete).toHaveBeenCalledWith('10');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'S3 delete failed on post removal (postId=10)',
        expect.any(Error),
      );
    });
  });

  describe('uploadImages', () => {
    it('uploads files and returns updated post', async () => {
      setFindOneMock(mockPost('1'));
      postImageRepository.count.mockResolvedValue(0);
      postImageRepository.create.mockImplementation((data: object) => data);
      postImageRepository.save.mockResolvedValue(undefined);
      s3Service.upload.mockResolvedValue(undefined);

      const result = await service.uploadImages('10', '1', [mockFile()]);

      expect(s3Service.upload).toHaveBeenCalledTimes(1);
      expect(postImageRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('throws ForbiddenException when uploading to another user post', async () => {
      setFindOneMock(mockPost('2'));

      await expect(
        service.uploadImages('10', '1', [mockFile()]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when total exceeds 4 images', async () => {
      setFindOneMock(mockPost('1'));
      postImageRepository.count.mockResolvedValue(3);

      await expect(
        service.uploadImages('10', '1', [mockFile(), mockFile()]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rolls back uploaded S3 keys when S3 upload fails mid-way', async () => {
      setFindOneMock(mockPost('1'));
      postImageRepository.count.mockResolvedValue(0);
      postImageRepository.create.mockImplementation((data: object) => data);
      s3Service.upload
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('S3 error'));
      s3Service.deleteMany.mockResolvedValue(undefined);

      await expect(
        service.uploadImages('10', '1', [mockFile(), mockFile()]),
      ).rejects.toThrow('S3 error');

      expect(s3Service.deleteMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/^images\/posts\/10\/.+\.jpg$/),
        ]),
      );
    });

    it('rolls back uploaded S3 keys when DB INSERT fails', async () => {
      setFindOneMock(mockPost('1'));
      postImageRepository.count.mockResolvedValue(0);
      postImageRepository.create.mockImplementation((data: object) => data);
      postImageRepository.save.mockRejectedValue(new Error('DB error'));
      s3Service.upload.mockResolvedValue(undefined);
      s3Service.deleteMany.mockResolvedValue(undefined);

      await expect(
        service.uploadImages('10', '1', [mockFile()]),
      ).rejects.toThrow('DB error');

      expect(s3Service.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('rethrows original error even when rollback deleteMany fails', async () => {
      setFindOneMock(mockPost('1'));
      postImageRepository.count.mockResolvedValue(0);
      postImageRepository.create.mockImplementation((data: object) => data);
      postImageRepository.save.mockRejectedValue(new Error('DB error'));
      s3Service.upload.mockResolvedValue(undefined);
      s3Service.deleteMany.mockRejectedValue(new Error('rollback failed'));

      await expect(
        service.uploadImages('10', '1', [mockFile()]),
      ).rejects.toThrow('DB error');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'S3 rollback failed after upload error',
        expect.any(Error),
      );
    });
  });
});
