import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { Like } from './entities/like.entity';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(WorkoutPost)
    private readonly workoutPostRepository: Repository<WorkoutPost>,
  ) {}

  private async assertPostExists(postId: string): Promise<void> {
    const post = await this.workoutPostRepository.findOne({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`WorkoutPost ${postId} not found`);
    }
  }

  async add(postId: string, userId: string): Promise<Like> {
    await this.assertPostExists(postId);
    const like = this.likeRepository.create({ workoutPostId: postId, userId });
    try {
      return await this.likeRepository.save(like);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === '23505'
      ) {
        throw new ConflictException('Already liked this post');
      }
      throw err;
    }
  }

  async remove(postId: string, userId: string): Promise<void> {
    await this.assertPostExists(postId);
    const like = await this.likeRepository.findOne({
      where: { workoutPostId: postId, userId },
    });
    if (!like) {
      throw new NotFoundException('Like not found');
    }
    await this.likeRepository.delete(like.id);
  }

  async count(postId: string): Promise<{ count: number }> {
    await this.assertPostExists(postId);
    const count = await this.likeRepository.count({
      where: { workoutPostId: postId },
    });
    return { count };
  }
}
