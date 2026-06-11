import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
    const { page = 1, limit = 20, feed = 'all', userId } = query;

    const qb = this.workoutPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.workoutExercises', 'we')
      .leftJoinAndSelect('we.exercise', 'exercise')
      .leftJoinAndSelect('we.sets', 'sets')
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) {
      qb.where('post.userId = :userId', { userId });
    } else if (feed === 'following') {
      qb.innerJoin(
        'follows',
        'f',
        'f.followee_id = post.user_id AND f.follower_id = :currentUserId',
        { currentUserId },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<WorkoutPost> {
    const post = await this.workoutPostRepository.findOne({
      where: { id },
      relations: ['user', 'workoutExercises', 'workoutExercises.exercise', 'workoutExercises.sets'],
    });
    if (!post) {
      throw new NotFoundException(`WorkoutPost ${id} not found`);
    }
    return post;
  }

  async create(dto: CreateWorkoutPostDto, userId: string): Promise<WorkoutPost> {
    return this.dataSource.transaction(async (manager) => {
      const post = manager.create(WorkoutPost, {
        userId,
        title: dto.title,
        note: dto.note ?? null,
        trainedOn: dto.trainedOn,
      });
      const savedPost = await manager.save(post);

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

      return this.findOne(savedPost.id);
    });
  }

  async update(
    id: string,
    dto: UpdateWorkoutPostDto,
    userId: string,
  ): Promise<WorkoutPost> {
    const post = await this.findOne(id);
    if (post.userId !== userId) {
      throw new ForbiddenException('Cannot update another user\'s post');
    }
    await this.workoutPostRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.note !== undefined && { note: dto.note }),
      ...(dto.trainedOn !== undefined && { trainedOn: dto.trainedOn }),
    });
    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.findOne(id);
    if (post.userId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s post');
    }
    await this.workoutPostRepository.delete(id);
  }
}
