import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { Like } from './entities/like.entity';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Like, WorkoutPost])],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
