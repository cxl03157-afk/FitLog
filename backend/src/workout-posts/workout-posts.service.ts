import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { S3Service } from '../s3/s3.service';
import { WorkoutExercise } from '../workout-exercises/entities/workout-exercise.entity';
import { CreateWorkoutPostDto } from './dto/create-workout-post.dto';
import { QueryWorkoutPostsDto } from './dto/query-workout-posts.dto';
import { UpdateWorkoutPostDto } from './dto/update-workout-post.dto';
import { PostImage } from './entities/post-image.entity';
import { WorkoutPost } from './entities/workout-post.entity';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class WorkoutPostsService {
  private readonly logger = new Logger(WorkoutPostsService.name);
  private readonly imageBaseUrl: string;

  constructor(
    @InjectRepository(WorkoutPost)
    private readonly workoutPostRepository: Repository<WorkoutPost>,
    @InjectRepository(PostImage)
    private readonly postImageRepository: Repository<PostImage>,
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
    private readonly config: ConfigService,
  ) {
    this.imageBaseUrl = config.get<string>('IMAGE_BASE_URL', '');
  }

  async findAll(
    query: QueryWorkoutPostsDto,
    currentUserId: string,
  ): Promise<{ data: WorkoutPost[]; total: number }> {
    const { page = 1, limit = 20 } = query;

    const countQb = this.workoutPostRepository.createQueryBuilder('post');
    this.applyFeedFilter(countQb, query, currentUserId);
    const total = await countQb.getCount();

    const dataQb = this.workoutPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.workoutExercises', 'we')
      .leftJoinAndSelect('we.exercise', 'exercise')
      .leftJoinAndSelect('we.sets', 'sets')
      .leftJoinAndSelect('post.postImages', 'pi')
      .addSelect(
        '(SELECT COUNT(*) FROM likes l WHERE l.workout_post_id = post.id)',
        'likeCount',
      )
      .addSelect(
        '(SELECT COUNT(*) FROM comments c WHERE c.workout_post_id = post.id)',
        'commentCount',
      )
      .addSelect(
        'EXISTS(SELECT 1 FROM likes lk WHERE lk.workout_post_id = post.id AND lk.user_id = :uid)',
        'isLiked',
      )
      .setParameter('uid', currentUserId)
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('pi.displayOrder', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    this.applyFeedFilter(dataQb, query, currentUserId);

    const { entities, raw } = await dataQb.getRawAndEntities();
    return {
      data: entities.map((entity, i) =>
        this.mergeRaw(this.attachImageUrls(entity), raw[i]),
      ),
      total,
    };
  }

  async findOne(id: string, currentUserId = ''): Promise<WorkoutPost> {
    const { entities, raw } = await this.workoutPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.workoutExercises', 'we')
      .leftJoinAndSelect('we.exercise', 'exercise')
      .leftJoinAndSelect('we.sets', 'sets')
      .leftJoinAndSelect('post.postImages', 'pi')
      .addSelect(
        '(SELECT COUNT(*) FROM likes l WHERE l.workout_post_id = post.id)',
        'likeCount',
      )
      .addSelect(
        '(SELECT COUNT(*) FROM comments c WHERE c.workout_post_id = post.id)',
        'commentCount',
      )
      .addSelect(
        'EXISTS(SELECT 1 FROM likes lk WHERE lk.workout_post_id = post.id AND lk.user_id = :uid)',
        'isLiked',
      )
      .setParameter('uid', currentUserId)
      .where('post.id = :id', { id })
      .addOrderBy('pi.displayOrder', 'ASC')
      .getRawAndEntities();

    if (entities.length === 0) {
      throw new NotFoundException(`WorkoutPost ${id} not found`);
    }
    return this.mergeRaw(this.attachImageUrls(entities[0]), raw[0]);
  }

  async create(
    dto: CreateWorkoutPostDto,
    userId: string,
  ): Promise<WorkoutPost> {
    let createdId = '';

    await this.dataSource.transaction(async (manager) => {
      const post = manager.create(WorkoutPost, {
        userId,
        title: dto.title,
        note: dto.note ?? null,
        trainedOn: dto.trainedOn,
      });
      const savedPost = await manager.save(post);
      createdId = savedPost.id;

      for (const exerciseDto of dto.exercises) {
        const we = manager.create(WorkoutExercise, {
          workoutPostId: savedPost.id,
          exerciseId: exerciseDto.exerciseId,
          orderIndex: exerciseDto.orderIndex,
        });
        const savedWe = await manager.save(we);

        for (const setDto of exerciseDto.sets) {
          const set = manager.create(ExerciseSet, {
            workoutExerciseId: savedWe.id,
            setNumber: setDto.setNumber,
            weightKg: setDto.weightKg,
            reps: setDto.reps,
            isPr: setDto.isPr ?? false,
            memo: setDto.memo ?? null,
          });
          await manager.save(set);
        }
      }
    });

    return this.findOne(createdId, userId);
  }

  async update(
    id: string,
    dto: UpdateWorkoutPostDto,
    userId: string,
  ): Promise<WorkoutPost> {
    const post = await this.findOne(id, userId);
    if (post.userId !== userId) {
      throw new ForbiddenException("Cannot update another user's post");
    }
    await this.workoutPostRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.note !== undefined && { note: dto.note }),
      ...(dto.trainedOn !== undefined && { trainedOn: dto.trainedOn }),
      updatedAt: new Date(),
    });
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.findOne(id, userId);
    if (post.userId !== userId) {
      throw new ForbiddenException("Cannot delete another user's post");
    }

    const images = await this.postImageRepository.find({
      where: { workoutPostId: id },
      select: { imageKey: true },
    });

    if (images.length > 0) {
      try {
        await this.s3Service.deleteMany(images.map((img) => img.imageKey));
      } catch (err) {
        this.logger.error(
          `S3 delete failed on post removal (postId=${id})`,
          err,
        );
      }
    }

    await this.workoutPostRepository.delete(id);
  }

  async uploadImages(
    postId: string,
    userId: string,
    files: Express.Multer.File[],
  ): Promise<WorkoutPost> {
    const post = await this.findOne(postId, userId);
    if (post.userId !== userId) {
      throw new ForbiddenException(
        "Cannot upload images to another user's post",
      );
    }

    const existingCount = await this.postImageRepository.count({
      where: { workoutPostId: postId },
    });
    if (existingCount + files.length > 4) {
      throw new BadRequestException(
        `Cannot exceed 4 images per post. Current: ${existingCount}, Adding: ${files.length}`,
      );
    }

    const uploadedKeys: string[] = [];
    try {
      const imageEntities: PostImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = MIME_TO_EXT[file.mimetype] ?? 'bin';
        const key = `images/posts/${postId}/${randomUUID()}.${ext}`;
        await this.s3Service.upload(key, file.buffer, file.mimetype);
        uploadedKeys.push(key);
        imageEntities.push(
          this.postImageRepository.create({
            workoutPostId: postId,
            imageKey: key,
            displayOrder: existingCount + i,
          }),
        );
      }
      await this.postImageRepository.save(imageEntities);
    } catch (err) {
      try {
        await this.s3Service.deleteMany(uploadedKeys);
      } catch (rollbackErr) {
        this.logger.error('S3 rollback failed after upload error', rollbackErr);
      }
      throw err;
    }

    return this.findOne(postId, userId);
  }

  private attachImageUrls(post: WorkoutPost): WorkoutPost {
    if (post.postImages) {
      post.postImages = post.postImages.map((img) => ({
        ...img,
        imageUrl: `${this.imageBaseUrl}/${img.imageKey}`,
      }));
    }
    return post;
  }

  private applyFeedFilter(
    qb: SelectQueryBuilder<WorkoutPost>,
    query: QueryWorkoutPostsDto,
    currentUserId: string,
  ): void {
    if (query.userId) {
      qb.where('post.userId = :userId', { userId: query.userId });
    } else if (query.feed === 'following') {
      qb.innerJoin(
        'follows',
        'f',
        'f.followee_id = post.user_id AND f.follower_id = :currentUserId',
        { currentUserId },
      );
    }
  }

  private mergeRaw(entity: WorkoutPost, raw: unknown): WorkoutPost {
    const r = raw as Record<string, unknown>;
    entity.likeCount = Number(r.likeCount ?? r.likecount ?? 0);
    entity.commentCount = Number(r.commentCount ?? r.commentcount ?? 0);
    const rawIsLiked = r.isLiked ?? r.isliked;
    entity.isLiked =
      rawIsLiked === true ||
      rawIsLiked === 't' ||
      rawIsLiked === 'true' ||
      rawIsLiked === '1' ||
      rawIsLiked === 1;
    return entity;
  }
}
