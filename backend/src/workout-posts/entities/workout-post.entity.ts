import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkoutExercise } from '../../workout-exercises/entities/workout-exercise.entity';
import { User } from '../../users/user.entity';

@Entity('workout_posts')
@Index('idx_workout_posts_user_id', ['userId'])
@Index('idx_workout_posts_created_at', ['createdAt'])
export class WorkoutPost {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'date', name: 'trained_on' })
  trainedOn: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => WorkoutExercise, (we) => we.workoutPost, { cascade: true })
  workoutExercises: WorkoutExercise[];

  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
}
