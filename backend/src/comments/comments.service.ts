import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(WorkoutPost)
    private readonly workoutPostRepository: Repository<WorkoutPost>,
  ) {}

  async findByPost(postId: string): Promise<Comment[]> {
    const post = await this.workoutPostRepository.findOne({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`WorkoutPost ${postId} not found`);
    }
    return this.commentRepository.find({
      where: { workoutPostId: postId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    postId: string,
    dto: CreateCommentDto,
    userId: string,
  ): Promise<Comment> {
    const post = await this.workoutPostRepository.findOne({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`WorkoutPost ${postId} not found`);
    }
    const comment = this.commentRepository.create({
      workoutPostId: postId,
      userId,
      content: dto.content,
    });
    const saved = await this.commentRepository.save(comment);
    const withUser = await this.commentRepository.findOneOrFail({
      where: { id: saved.id },
      relations: { user: true },
    });
    return withUser;
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: { workoutPost: true },
    });
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    const isCommentOwner = comment.userId === userId;
    const isPostOwner = comment.workoutPost.userId === userId;
    if (!isCommentOwner && !isPostOwner) {
      throw new ForbiddenException('Cannot delete this comment');
    }
    await this.commentRepository.delete(id);
  }
}
