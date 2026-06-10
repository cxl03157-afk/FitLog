import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('throws ConflictException when username exists', async () => {
      repository.findOne.mockResolvedValueOnce({ id: '1' } as User);

      await expect(
        service.create({
          username: 'taken',
          displayName: 'Test',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when email exists', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: '1' } as User);

      await expect(
        service.create({
          username: 'newuser',
          displayName: 'Test',
          email: 'taken@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
