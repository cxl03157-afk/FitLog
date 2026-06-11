import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExerciseSet } from '../../exercise-sets/entities/exercise-set.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { WorkoutPost } from '../../workout-posts/entities/workout-post.entity';

@Entity('workout_exercises')
export class WorkoutExercise {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'workout_post_id' })
  workoutPostId: string;

  @Column({ type: 'bigint', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'int', name: 'order_index' })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => WorkoutPost, (post) => post.workoutExercises, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_post_id' })
  workoutPost: WorkoutPost;

  @ManyToOne(() => Exercise)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @OneToMany(() => ExerciseSet, (set) => set.workoutExercise, { cascade: true })
  sets: ExerciseSet[];
}
