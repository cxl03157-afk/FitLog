import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkoutPost } from './workout-post.entity';

@Entity('post_images')
export class PostImage {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'workout_post_id' })
  workoutPostId: string;

  @Column({ type: 'varchar', length: 500, name: 'image_key' })
  imageKey: string;

  @Column({ type: 'int', name: 'display_order' })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => WorkoutPost, (post) => post.postImages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_post_id' })
  workoutPost: WorkoutPost;

  imageUrl?: string;
}
