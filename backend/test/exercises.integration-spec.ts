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

describe('Exercises Integration', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let ownerToken: string;
  let otherToken: string;

  let ownerExerciseId: string;
  let otherExerciseId: string;
  let inUseExerciseId: string;
  let workoutPostId: string;
  const createdExerciseIds: string[] = [];

  const ts = Date.now();
  const ownerUser = {
    username: `exown_${ts}`,
    displayName: 'Exercise Owner',
    email: `exown_${ts}@example.com`,
    password: 'password123',
  };
  const otherUser = {
    username: `exoth_${ts}`,
    displayName: 'Exercise Other',
    email: `exoth_${ts}@example.com`,
    password: 'password123',
  };

  const STANDARD_NAME = 'ベンチプレス'; // 標準種目シードに必ず含まれる
  const ownerExName = `IntgExA_${ts}`;
  const otherExName = `IntgExO_${ts}`;
  const inUseExName = `IntgExInUse_${ts}`;
  const postNormalExName = `IntgExPost_${ts}`;
  const deleteTargetName = `IntgExDel_${ts}`;

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

    // Register and login ownerUser
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(ownerUser);
    const ownerLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerUser.email, password: ownerUser.password });
    ownerToken = ownerLoginRes.body.accessToken as string;

    // Register and login otherUser
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(otherUser);
    const otherLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: otherUser.email, password: otherUser.password });
    otherToken = otherLoginRes.body.accessToken as string;

    // Seed: other user creates their exercise
    const otherExRes = await request(app.getHttpServer())
      .post('/api/exercises')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: otherExName, category: '胸' });
    otherExerciseId = (otherExRes.body as { id: string }).id;
    createdExerciseIds.push(otherExerciseId);

    // Seed: owner creates main exercise (used in GET/PATCH/DELETE 403 tests)
    const ownerExRes = await request(app.getHttpServer())
      .post('/api/exercises')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: ownerExName, category: '胸' });
    ownerExerciseId = (ownerExRes.body as { id: string }).id;
    createdExerciseIds.push(ownerExerciseId);

    // Seed: owner creates inUse exercise (for DELETE 409 test)
    const inUseRes = await request(app.getHttpServer())
      .post('/api/exercises')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: inUseExName, category: '脚' });
    inUseExerciseId = (inUseRes.body as { id: string }).id;
    createdExerciseIds.push(inUseExerciseId);

    // Seed: workout_post that references inUseExercise
    const postRes = await request(app.getHttpServer())
      .post('/api/workout-posts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: '種目統合テスト投稿',
        trainedOn: '2026-06-30',
        exercises: [
          {
            exerciseId: inUseExerciseId,
            orderIndex: 0,
            sets: [{ setNumber: 1, weightKg: 60, reps: 10 }],
          },
        ],
      });
    workoutPostId = (postRes.body as { id: string }).id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      // workout_post を CASCADE 削除 → workout_exercises も消える
      if (workoutPostId) {
        await dataSource.query('DELETE FROM workout_posts WHERE id = $1', [
          workoutPostId,
        ]);
      }
      // 作成した全独自種目を削除（API で削除済みのものは 0 件でスキップ）
      for (const id of createdExerciseIds.filter(Boolean)) {
        await dataSource.query('DELETE FROM exercises WHERE id = $1', [id]);
      }
      await dataSource.destroy();
    }
    await app.close();
  });

  // ─── GET /api/exercises ──────────────────────────────────────────────────────

  describe('GET /api/exercises', () => {
    it('includes all 23 standard exercises (userId=null)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const exercises = res.body as {
        id: string;
        userId: string | null;
        name: string;
      }[];
      const standard = exercises.filter((e) => e.userId === null);
      expect(standard.length).toBe(23);
      expect(standard.some((e) => e.name === STANDARD_NAME)).toBe(true);
    });

    it('includes own custom exercise', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const ids = (res.body as { id: string }[]).map((e) => e.id);
      expect(ids).toContain(ownerExerciseId);
    });

    it('does not include other user custom exercise', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const ids = (res.body as { id: string }[]).map((e) => e.id);
      expect(ids).not.toContain(otherExerciseId);
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/exercises').expect(401);
    });
  });

  // ─── POST /api/exercises ─────────────────────────────────────────────────────

  describe('POST /api/exercises', () => {
    it('creates custom exercise → 201 with userId and correct fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: postNormalExName,
          category: '背中',
          description: '説明テスト',
        })
        .expect(201);

      const body = res.body as {
        id: string;
        name: string;
        category: string;
        description: string | null;
        userId: string | null;
      };
      expect(body.id).toBeDefined();
      expect(body.name).toBe(postNormalExName);
      expect(body.category).toBe('背中');
      expect(body.description).toBe('説明テスト');
      expect(body.userId).not.toBeNull();
      createdExerciseIds.push(body.id);
    });

    it('returns 409 when name conflicts with standard exercise', async () => {
      await request(app.getHttpServer())
        .post('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: STANDARD_NAME, category: '胸' })
        .expect(409);
    });

    it('returns 409 when name conflicts with own custom exercise', async () => {
      await request(app.getHttpServer())
        .post('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: ownerExName, category: '背中' })
        .expect(409);
    });

    it('allows name same as other user exercise → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: otherExName, category: '体幹' })
        .expect(201);

      const body = res.body as {
        id: string;
        name: string;
        userId: string | null;
      };
      expect(body.name).toBe(otherExName);
      expect(body.userId).not.toBeNull();
      createdExerciseIds.push(body.id);
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/exercises')
        .send({ name: 'テスト', category: '胸' })
        .expect(401);
    });
  });

  // ─── GET /api/exercises/:id ──────────────────────────────────────────────────

  describe('GET /api/exercises/:id', () => {
    it('returns own custom exercise → 200 with userId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/exercises/${ownerExerciseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { id: string; userId: string | null };
      expect(body.id).toBe(ownerExerciseId);
      expect(body.userId).not.toBeNull();
    });

    it('returns 404 for other user custom exercise', async () => {
      await request(app.getHttpServer())
        .get(`/api/exercises/${otherExerciseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('returns standard exercise → 200 with userId=null', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`);
      const standardEx = (
        listRes.body as { id: string; userId: string | null }[]
      ).find((e) => e.userId === null);

      const res = await request(app.getHttpServer())
        .get(`/api/exercises/${standardEx!.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect((res.body as { userId: string | null }).userId).toBeNull();
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/exercises/${ownerExerciseId}`)
        .expect(401);
    });
  });

  // ─── PATCH /api/exercises/:id ────────────────────────────────────────────────

  describe('PATCH /api/exercises/:id', () => {
    it('updates own custom exercise → 200 with updated name', async () => {
      const newName = `${ownerExName}_upd`;
      const res = await request(app.getHttpServer())
        .patch(`/api/exercises/${ownerExerciseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: newName })
        .expect(200);

      expect((res.body as { name: string }).name).toBe(newName);
    });

    it('returns 403 for other user custom exercise', async () => {
      await request(app.getHttpServer())
        .patch(`/api/exercises/${otherExerciseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'unauthorized_update' })
        .expect(403);
    });

    it('returns 403 for standard exercise', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`);
      const standardEx = (
        listRes.body as { id: string; userId: string | null }[]
      ).find((e) => e.userId === null);

      await request(app.getHttpServer())
        .patch(`/api/exercises/${standardEx!.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'unauthorized_update' })
        .expect(403);
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/api/exercises/${ownerExerciseId}`)
        .send({ name: 'unauthorized_update' })
        .expect(401);
    });
  });

  // ─── DELETE /api/exercises/:id ───────────────────────────────────────────────

  describe('DELETE /api/exercises/:id', () => {
    it('returns 403 for other user custom exercise', async () => {
      await request(app.getHttpServer())
        .delete(`/api/exercises/${otherExerciseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('returns 403 for standard exercise', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`);
      const standardEx = (
        listRes.body as { id: string; userId: string | null }[]
      ).find((e) => e.userId === null);

      await request(app.getHttpServer())
        .delete(`/api/exercises/${standardEx!.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('returns 409 when exercise is used in workout_exercises', async () => {
      await request(app.getHttpServer())
        .delete(`/api/exercises/${inUseExerciseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);
    });

    it('deletes unused own custom exercise → 204', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/exercises')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: deleteTargetName, category: '肩' })
        .expect(201);
      const deleteTargetId = (createRes.body as { id: string }).id;
      createdExerciseIds.push(deleteTargetId); // 削除済みでもafterAll で 0 件スキップ

      await request(app.getHttpServer())
        .delete(`/api/exercises/${deleteTargetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/exercises/${ownerExerciseId}`)
        .expect(401);
    });
  });
});
