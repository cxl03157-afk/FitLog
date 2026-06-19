import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('AWS_S3_ENDPOINT');
    const forcePathStyle =
      config.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true';

    this.client = new S3Client({
      region: config.getOrThrow<string>('AWS_S3_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
      ...(endpoint ? { endpoint, forcePathStyle } : {}),
    });

    this.bucket = config.getOrThrow<string>('AWS_S3_BUCKET');
  }

  async upload(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
    this.logger.log(`Uploaded s3://${this.bucket}/${key}`);
  }

  async deleteOne(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted s3://${this.bucket}/${key}`);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
    this.logger.log(`Deleted ${keys.length} objects from s3://${this.bucket}`);
  }
}
