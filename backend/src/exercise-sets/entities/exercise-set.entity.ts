import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkoutExercise } from '../../workout-exercises/entities/workout-exercise.entity';

@Entity('exercise_sets')
export class ExerciseSet {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'workout_exercise_id' })
  workoutExerciseId: string;

  @Column({ type: 'int', name: 'set_number' })
  setNumber: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'weight_kg',
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v == null ? v : parseFloat(v)),
    },
  })
  weightKg: number;

  @Column({ type: 'int' })
  reps: number;

  @Column({ type: 'boolean', name: 'is_pr', default: false })
  isPr: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  memo: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => WorkoutExercise, (we) => we.sets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workout_exercise_id' })
  workoutExercise: WorkoutExercise;
}
