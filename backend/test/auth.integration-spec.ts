import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { REFRESH_COOKIE_NAME } from '../src/common/constants/auth.constants';

describe('Auth Integration (register/login/refresh)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const testUser = {
    username: `user_${Date.now()}`,
    displayName: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
  };

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ?? 'test-integration-secret-32chars!!';
    process.env.FRONTEND_ORIGIN =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it('POST /api/auth/register creates user and returns access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.headers['set-cookie']).toBeDefined();
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))).toBe(
      true,
    );
  });

  it('POST /api/auth/login authenticates user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.username).toBe(testUser.username);
  });

  it('POST /api/auth/refresh rotates tokens', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
      .send({ email: testUser.email, password: testUser.password });

    const cookies = loginResponse.headers['set-cookie'];

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Origin', process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
      .set('Cookie', cookies)
      .expect(200);

    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.headers['set-cookie']).toBeDefined();
  });
});
