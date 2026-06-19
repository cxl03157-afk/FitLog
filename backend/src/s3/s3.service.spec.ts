import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  DeleteObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  DeleteObjectsCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

const configValues: Record<string, string> = {
  AWS_S3_REGION: 'ap-northeast-1',
  AWS_S3_ENDPOINT: 'http://localhost:4566',
  AWS_S3_FORCE_PATH_STYLE: 'true',
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  AWS_S3_BUCKET: 'fitlog',
};

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key],
            getOrThrow: (key: string) => {
              const v = configValues[key];
              if (!v) throw new Error(`Config ${key} not found`);
              return v;
            },
          },
        },
      ],
    }).compile();

    service = module.get(S3Service);
  });

  describe('upload', () => {
    it('calls S3Client.send with PutObjectCommand', async () => {
      mockSend.mockResolvedValue({});

      await service.upload(
        'images/posts/1/test.jpg',
        Buffer.from('data'),
        'image/jpeg',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('propagates S3 error', async () => {
      mockSend.mockRejectedValue(new Error('S3 error'));

      await expect(
        service.upload('key', Buffer.from('data'), 'image/jpeg'),
      ).rejects.toThrow('S3 error');
    });
  });

  describe('deleteOne', () => {
    it('calls S3Client.send with DeleteObjectCommand', async () => {
      mockSend.mockResolvedValue({});

      await service.deleteOne('images/posts/1/test.jpg');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteMany', () => {
    it('calls S3Client.send with DeleteObjectsCommand when keys present', async () => {
      mockSend.mockResolvedValue({});

      await service.deleteMany(['key1', 'key2']);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('skips S3 call when keys array is empty', async () => {
      await service.deleteMany([]);

      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
