import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutExercise } from '../workout-exercises/entities/workout-exercise.entity';
import { CreateWorkoutPostDto } from './dto/create-workout-post.dto';
import { QueryWorkoutPostsDto } from './dto/query-workout-posts.dto';
import { UpdateWorkoutPostDto } from './dto/update-workout-post.dto';
import { WorkoutPost } from './entities/workout-post.entity';

@Injectable()
export class WorkoutPostsService {
  constructor(
    @InjectRepository(WorkoutPost)
    private readonly workoutPostRepository: Repository<WorkoutPost>,
    private readonly dataSource: DataSource,
  ) {}

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
      .skip((page - 1) * limit)
      .take(limit);

    this.applyFeedFilter(dataQb, query, currentUserId);

    const { entities, raw } = await dataQb.getRawAndEntities();
    return {
      data: entities.map((entity, i) => this.mergeRaw(entity, raw[i])),
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
      .getRawAndEntities();

    if (entities.length === 0) {
      throw new NotFoundException(`WorkoutPost ${id} not found`);
    }
    return this.mergeRaw(entities[0], raw[0]);
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
    await this.workoutPostRepository.delete(id);
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
