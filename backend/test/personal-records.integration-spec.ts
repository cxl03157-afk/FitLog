import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { S3Service } from '../src/s3/s3.service';
import { PersonalRecordsService } from '../src/personal-records/personal-records.service';

const mockS3Service = {
  upload: jest.fn().mockResolvedValue(undefined),
  deleteMany: jest.fn().mockResolvedValue(undefined),
  deleteOne: jest.fn().mockResolvedValue(undefined),
};

/** bigint auto-increment ID として確実に存在しない値 */
const NONEXISTENT_ID = '9999999999';

describe('PersonalRecords Integration', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let ownerToken: string;
  let otherToken: string;
  let exerciseId: string;

  const ts = Date.now();
  const ownerUser = {
    username: `prown_${ts}`,
    displayName: 'PR Owner',
    email: `prown_${ts}@example.com`,
    password: 'password123',
  };
  const otherUser = {
    username: `proth_${ts}`,
    displayName: 'PR Other',
    email: `proth_${ts}@example.com`,
    password: 'password123',
  };

  /** owner として PR レコードを1件作成して返す。失敗時は 201 アサーション違反で即停止。 */
  const createRecord = async (
    overrides: Record<string, unknown> = {},
  ): Promise<{ id: string }> => {
    const res = await request(app.getHttpServer())
      .post('/api/personal-records')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        exerciseId,
        recordType: 'MAX_WEIGHT',
        weightKg: 100,
        achievedAt: '2026-01-01',
        ...overrides,
      })
      .expect(201);
    return res.body as { id: string };
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

    // 他のintegration specと重複しない名前でexerciseをseed（Date.now() suffixで同名衝突を防ぐ）
    const exerciseName = `プレスPR統合テスト_${Date.now()}`;
    const result = await dataSource.query<{ id: string }[]>(
      `INSERT INTO exercises (name, category) VALUES ($1, $2) RETURNING id`,
      [exerciseName, '胸'],
    );
    exerciseId = result[0].id;

    // owner 登録 & ログイン
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(ownerUser);
    const ownerLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerUser.email, password: ownerUser.password });
    ownerToken = ownerLoginRes.body.accessToken as string;

    // other user 登録 & ログイン
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(otherUser);
    const otherLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: otherUser.email, password: otherUser.password });
    otherToken = otherLoginRes.body.accessToken as string;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      // personal_records は exercises への NO ACTION FK があるため先に削除する
      await dataSource.query(
        `DELETE FROM personal_records WHERE exercise_id = $1`,
        [exerciseId],
      );
      await dataSource.query(`DELETE FROM exercises WHERE id = $1`, [
        exerciseId,
      ]);
      await dataSource.destroy();
    }
    await app.close();
  });

  // ─── POST /api/personal-records ─────────────────────────────────────────────

  describe('POST /api/personal-records', () => {
    it('valid MAX_WEIGHT → 201 with id and correct fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId,
          recordType: 'MAX_WEIGHT',
          weightKg: 100,
          achievedAt: '2026-01-15',
        })
        .expect(201);

      const body = res.body as {
        id: string;
        recordType: string;
        weightKg: number;
        exerciseId: string;
      };
      expect(body.id).toBeDefined();
      expect(body.recordType).toBe('MAX_WEIGHT');
      expect(body.weightKg).toBe(100);
      expect(body.exerciseId).toBe(exerciseId);
    });

    it('valid MAX_REPS → 201 with id and correct fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId,
          recordType: 'MAX_REPS',
          reps: 15,
          achievedAt: '2026-01-16',
        })
        .expect(201);

      const body = res.body as {
        id: string;
        recordType: string;
        reps: number;
        exerciseId: string;
      };
      expect(body.id).toBeDefined();
      expect(body.recordType).toBe('MAX_REPS');
      expect(body.reps).toBe(15);
      expect(body.exerciseId).toBe(exerciseId);
    });

    it('MAX_WEIGHT without weightKg → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId,
          recordType: 'MAX_WEIGHT',
          achievedAt: '2026-01-01',
        })
        .expect(400);

      expect((res.body as { message: string }).message).toContain('weightKg');
    });

    it('MAX_WEIGHT with weightKg=0 → 400 (0kg not allowed)', async () => {
      // 修正前: @Min(0) が 0 を許可するため 201 → FAIL
      // 修正後: @Min(0.01) が 0 を拒否するため 400 → PASS
      await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId,
          recordType: 'MAX_WEIGHT',
          weightKg: 0,
          achievedAt: '2026-01-01',
        })
        .expect(400);
    });

    it('MAX_REPS without reps → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId,
          recordType: 'MAX_REPS',
          achievedAt: '2026-01-01',
        })
        .expect(400);

      expect((res.body as { message: string }).message).toContain('reps');
    });

    it('non-existent exerciseId → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          exerciseId: NONEXISTENT_ID,
          recordType: 'MAX_WEIGHT',
          weightKg: 100,
          achievedAt: '2026-01-01',
        })
        .expect(404);

      expect((res.body as { statusCode: number }).statusCode).toBe(404);
    });

    it('without auth → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-records')
        .send({
          exerciseId,
          recordType: 'MAX_WEIGHT',
          weightKg: 100,
          achievedAt: '2026-01-01',
        })
        .expect(401);

      expect((res.body as { statusCode: number }).statusCode).toBe(401);
    });
  });

  // ─── GET /api/personal-records ───────────────────────────────────────────────

  describe('GET /api/personal-records', () => {
    it('returns own records only, achievedAt DESC', async () => {
      // 異なる日付で2件作成して順序を確認できるようにする
      await createRecord({ achievedAt: '2025-03-01', weightKg: 80 });
      await createRecord({ achievedAt: '2025-09-01', weightKg: 90 });

      const res = await request(app.getHttpServer())
        .get('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const records = res.body as {
        id: string;
        userId: string;
        achievedAt: string;
      }[];
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);

      // 全レコードが同一 userId（owner のみ）
      const userIds = records.map((r) => r.userId);
      expect(new Set(userIds).size).toBe(1);

      // achievedAt の降順を確認（同日の場合は createdAt DESC のため等値は許容）
      for (let i = 0; i < records.length - 1; i++) {
        expect(records[i].achievedAt >= records[i + 1].achievedAt).toBe(true);
      }
    });

    it('without auth → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/personal-records')
        .expect(401);

      expect((res.body as { statusCode: number }).statusCode).toBe(401);
    });
  });

  // ─── GET /api/personal-records/:id ──────────────────────────────────────────

  describe('GET /api/personal-records/:id', () => {
    it('own record → 200 with correct id and exercise relation', async () => {
      const created = await createRecord();

      const res = await request(app.getHttpServer())
        .get(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as {
        id: string;
        recordType: string;
        exercise: { id: string };
      };
      expect(body.id).toBe(created.id);
      expect(body.recordType).toBe('MAX_WEIGHT');
      expect(body.exercise).toBeDefined();
      expect(body.exercise.id).toBe(exerciseId);
    });

    it("other user's record → 403", async () => {
      // other user が PR を作成
      const otherRes = await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          exerciseId,
          recordType: 'MAX_WEIGHT',
          weightKg: 80,
          achievedAt: '2026-02-01',
        })
        .expect(201);
      const otherId = (otherRes.body as { id: string }).id;

      // owner が other のレコードにアクセス → 403
      const res = await request(app.getHttpServer())
        .get(`/api/personal-records/${otherId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect((res.body as { statusCode: number }).statusCode).toBe(403);
    });

    it('non-existent id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/personal-records/${NONEXISTENT_ID}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect((res.body as { statusCode: number }).statusCode).toBe(404);
    });
  });

  // ─── PUT /api/personal-records/:id ──────────────────────────────────────────

  describe('PUT /api/personal-records/:id', () => {
    it('weightKg update → 200, new value reflected in response', async () => {
      const created = await createRecord({ weightKg: 100 });

      const res = await request(app.getHttpServer())
        .put(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ weightKg: 120 })
        .expect(200);

      expect((res.body as { weightKg: number }).weightKg).toBe(120);
    });

    it('note=null → 200, note is null in response', async () => {
      const created = await createRecord({ note: 'delete me' });

      const res = await request(app.getHttpServer())
        .put(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: null })
        .expect(200);

      expect((res.body as { note: unknown }).note).toBeNull();
    });

    it('weightKg=null → 400', async () => {
      const created = await createRecord();

      const res = await request(app.getHttpServer())
        .put(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ weightKg: null })
        .expect(400);

      expect((res.body as { statusCode: number }).statusCode).toBe(400);
    });

    it('weightKg=0 → 400 (0kg not allowed)', async () => {
      const created = await createRecord({ weightKg: 100 });

      // 修正前: @Min(0) が 0 を許可するため 200 → FAIL
      // 修正後: @Min(0.01) が 0 を拒否するため 400 → PASS
      await request(app.getHttpServer())
        .put(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ weightKg: 0 })
        .expect(400);
    });

    it('recordType change to different value → 400 with correct message', async () => {
      const created = await createRecord({
        recordType: 'MAX_WEIGHT',
        weightKg: 100,
      });

      const res = await request(app.getHttpServer())
        .put(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ recordType: 'MAX_REPS' })
        .expect(400);

      expect((res.body as { message: string }).message).toBe(
        'recordType cannot be changed after creation',
      );
    });
  });

  // ─── AllExceptionsFilter ──────────────────────────────────────────────────────

  describe('AllExceptionsFilter', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('invalid DTO → 400 (ValidationPipe + AllExceptionsFilter coexistence, message is array)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);

      const body = res.body as {
        statusCode: number;
        message: unknown;
        error: string;
      };
      expect(body.statusCode).toBe(400);
      expect(Array.isArray(body.message)).toBe(true);
      expect(body.error).toBe('Bad Request');
    });

    it('unexpected error → 500 でmock復元後は通常動作する (AllExceptionsFilter 配線確認)', async () => {
      const service = app.get(PersonalRecordsService);
      const spy = jest
        .spyOn(service, 'findAll')
        .mockRejectedValueOnce(new TypeError('DB gone'));

      try {
        const response = await request(app.getHttpServer())
          .get('/api/personal-records')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(500);

        expect(response.body).toEqual({
          statusCode: 500,
          message: 'Internal server error',
        });
        expect((response.body as { stack?: unknown }).stack).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('DB gone');
      } finally {
        spy.mockRestore();
      }

      await request(app.getHttpServer())
        .get('/api/personal-records')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
  });

  // ─── DELETE /api/personal-records/:id ───────────────────────────────────────

  describe('DELETE /api/personal-records/:id', () => {
    it('success → 204, subsequent GET :id returns 404', async () => {
      const created = await createRecord();

      await request(app.getHttpServer())
        .delete(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // 削除後に同じIDを GET → 404
      await request(app.getHttpServer())
        .get(`/api/personal-records/${created.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('non-existent id → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/personal-records/${NONEXISTENT_ID}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect((res.body as { statusCode: number }).statusCode).toBe(404);
    });
  });
});
