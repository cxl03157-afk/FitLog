import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { WorkoutPost } from '../../workout-posts/entities/workout-post.entity';

@Entity('likes')
@Unique('UQ_likes_post_user', ['workoutPostId', 'userId'])
export class Like {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'workout_post_id' })
  workoutPostId: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => WorkoutPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workout_post_id' })
  workoutPost: WorkoutPost;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
