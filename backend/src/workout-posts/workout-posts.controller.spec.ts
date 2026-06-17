import { ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { WorkoutPost } from './entities/workout-post.entity';
import { WorkoutPostsController } from './workout-posts.controller';
import { WorkoutPostsService } from './workout-posts.service';

const makeUser = (): User =>
  Object.assign(new User(), {
    id: '1',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-secret',
    avatarKey: null,
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makePost = (id = '10'): WorkoutPost =>
  Object.assign(new WorkoutPost(), {
    id,
    userId: '1',
    title: '胸の日',
    note: null,
    trainedOn: '2026-06-17',
    createdAt: new Date(),
    updatedAt: null,
    user: makeUser(),
    workoutExercises: [],
  });

const mockService = {
  findAll: jest.fn().mockResolvedValue({ data: [makePost()], total: 1 }),
  findOne: jest.fn().mockResolvedValue(makePost()),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('WorkoutPostsController — passwordHash serialization', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WorkoutPostsController],
      providers: [{ provide: WorkoutPostsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ user: { sub: string } }>();
          req.user = { sub: '1' };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/workout-posts — data[0].user に passwordHash が含まれない', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/workout-posts')
      .expect(200);

    const body = res.body as { data: Array<{ user: Record<string, unknown> }> };
    const user = body.data[0].user;
    expect(user).not.toHaveProperty('passwordHash');
    expect(user['username']).toBe('testuser');
    expect(user['displayName']).toBe('Test User');
  });

  it('GET /api/workout-posts/:id — user に passwordHash が含まれない', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/workout-posts/10')
      .expect(200);

    const body = res.body as { user: Record<string, unknown> };
    const user = body.user;
    expect(user).not.toHaveProperty('passwordHash');
    expect(user['username']).toBe('testuser');
    expect(user['displayName']).toBe('Test User');
  });
});
