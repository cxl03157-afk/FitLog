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

describe('Users Integration', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;

  const ts = Date.now();
  const testUser = {
    username: `av_${ts}`,
    displayName: 'User Test',
    email: `avtest_${ts}@example.com`,
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

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginRes.body.accessToken as string;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe('PATCH /api/users/me/avatar', () => {
    beforeEach(() => {
      mockS3Service.upload.mockResolvedValue(undefined);
      mockS3Service.deleteOne.mockResolvedValue(undefined);
    });

    it('uploads avatar and returns avatarKey and avatarUrl', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      const body = res.body as { avatarKey: string; avatarUrl: string };
      expect(body.avatarKey).toMatch(/^images\/avatars\/.+\/.+\.jpg$/);
      expect(body.avatarUrl).toContain(body.avatarKey);
      expect(mockS3Service.upload).toHaveBeenCalled();
    });

    it('returns 400 when no file is provided', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('returns 400 when unsupported MIME type is provided', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', Buffer.from('fake-gif-data'), {
          filename: 'avatar.gif',
          contentType: 'image/gif',
        })
        .expect(400);
    });

    it('returns 400 when file exceeds 10MB', async () => {
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
      await request(app.getHttpServer())
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', oversizedBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });
  });
});
