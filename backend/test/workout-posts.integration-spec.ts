import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { S3Service } from '../src/s3/s3.service';

const mockS3Service = {
  upload: jest.fn().mockResolvedValue(undefined),
  deleteMany: jest.fn().mockResolvedValue(undefined),
  deleteOne: jest.fn().mockResolvedValue(undefined),
};

describe('WorkoutPosts Integration', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let postId: string;
  let exerciseId: string;

  const ts = Date.now();
  const testUser = {
    username: `wpuser_${ts}`,
    displayName: 'WP Test User',
    email: `wptest_${ts}@example.com`,
    password: 'password123',
  };

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ?? 'test-integration-secret-32chars!!';
    process.env.FRONTEND_ORIGIN =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(mockS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(cookieParser());
    app.enableCors({
      origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    });

    await app.init();
    dataSource = app.get(DataSource);
    await dataSource.runMigrations();

    // Seed: exercise（Date.now() suffixで同名衝突を防ぐ）
    const exerciseName = `ベンチプレス_${Date.now()}`;
    const result = await dataSource.query<{ id: string }[]>(
      `INSERT INTO exercises (name, category) VALUES ($1, $2) RETURNING id`,
      [exerciseName, '胸'],
    );
    exerciseId = result[0].id;

    // Register user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser);

    // Login to get access token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginRes.body.accessToken as string;

    // Create a workout post
    const createRes = await request(app.getHttpServer())
      .post('/api/workout-posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '統合テスト投稿',
        trainedOn: '2026-06-18',
        exercises: [
          {
            exerciseId,
            orderIndex: 0,
            sets: [{ setNumber: 1, weightKg: 80, reps: 5 }],
          },
        ],
      });
    postId = createRes.body.id as string;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe('GET /api/workout-posts', () => {
    it('returns likeCount, commentCount, isLiked as correct types', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/workout-posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const post = (res.body.data as { id: string }[]).find(
        (p) => p.id === postId,
      );
      expect(post).toBeDefined();
      const p = post as unknown as {
        likeCount: unknown;
        commentCount: unknown;
        isLiked: unknown;
      };
      expect(typeof p.likeCount).toBe('number');
      expect(typeof p.commentCount).toBe('number');
      expect(typeof p.isLiked).toBe('boolean');
      expect(p.likeCount).toBe(0);
      expect(p.commentCount).toBe(0);
      expect(p.isLiked).toBe(false);
    });

    it('does not include user.passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/workout-posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const post = (res.body.data as { user: Record<string, unknown> }[]).find(
        (p) => (p as unknown as { id: string }).id === postId,
      );
      expect(post?.user?.passwordHash).toBeUndefined();
    });

    it('returns isLiked true after liking', async () => {
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/workout-posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const post = (
        res.body.data as { id: string; likeCount: number; isLiked: boolean }[]
      ).find((p) => p.id === postId);
      expect(post?.isLiked).toBe(true);
      expect(post?.likeCount).toBe(1);

      // Clean up like for subsequent tests
      await request(app.getHttpServer())
        .delete(`/api/workout-posts/${postId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`);
    });
  });

  describe('GET /api/workout-posts/:id', () => {
    it('returns likeCount, commentCount, isLiked as correct types', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/workout-posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const p = res.body as {
        likeCount: unknown;
        commentCount: unknown;
        isLiked: unknown;
        user: Record<string, unknown>;
      };
      expect(typeof p.likeCount).toBe('number');
      expect(typeof p.commentCount).toBe('number');
      expect(typeof p.isLiked).toBe('boolean');
      expect(p.likeCount).toBe(0);
      expect(p.commentCount).toBe(0);
      expect(p.isLiked).toBe(false);
    });

    it('does not include user.passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/workout-posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        (res.body as { user: Record<string, unknown> }).user.passwordHash,
      ).toBeUndefined();
    });

    it('returns isLiked true after liking', async () => {
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`);

      const res = await request(app.getHttpServer())
        .get(`/api/workout-posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const p = res.body as { isLiked: boolean; likeCount: number };
      expect(p.isLiked).toBe(true);
      expect(p.likeCount).toBe(1);

      await request(app.getHttpServer())
        .delete(`/api/workout-posts/${postId}/likes`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    it('returns commentCount 1 after posting a comment', async () => {
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: 'テストコメント' });

      const res = await request(app.getHttpServer())
        .get(`/api/workout-posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((res.body as { commentCount: number }).commentCount).toBe(1);
    });
  });

  describe('POST /api/workout-posts/:id/comments - 280 char limit', () => {
    it('rejects comment longer than 280 chars', async () => {
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: 'あ'.repeat(281) })
        .expect(400);
    });

    it('accepts comment of exactly 280 chars', async () => {
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: 'あ'.repeat(280) })
        .expect(201);
    });
  });

  describe('POST /api/workout-posts/:id/images', () => {
    beforeEach(() => {
      mockS3Service.upload.mockResolvedValue(undefined);
      mockS3Service.deleteMany.mockResolvedValue(undefined);
    });

    it('uploads an image and returns post with images[]', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/images`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('images', Buffer.from('fake-image-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const body = res.body as {
        id: string;
        postImages: {
          imageKey: string;
          imageUrl: string;
          displayOrder: number;
        }[];
      };
      expect(body.id).toBe(postId);
      expect(Array.isArray(body.postImages)).toBe(true);
      expect(body.postImages.length).toBeGreaterThan(0);
      expect(body.postImages[0].imageKey).toMatch(
        /^images\/posts\/.+\/.+\.jpg$/,
      );
      expect(body.postImages[0].displayOrder).toBe(0);
      expect(mockS3Service.upload).toHaveBeenCalled();
    });

    it('returns 400 when no file is provided', async () => {
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/images`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('returns 400 when unsupported MIME type is provided', async () => {
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/images`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('images', Buffer.from('fake-gif-data'), {
          filename: 'test.gif',
          contentType: 'image/gif',
        })
        .expect(400);
    });

    it('returns 400 when file exceeds 10MB', async () => {
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
      await request(app.getHttpServer())
        .post(`/api/workout-posts/${postId}/images`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('images', oversizedBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('does not include user.passwordHash in response', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/workout-posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        (res.body as { user: Record<string, unknown> }).user.passwordHash,
      ).toBeUndefined();
    });
  });
});
