import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, WorkoutPost])],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
