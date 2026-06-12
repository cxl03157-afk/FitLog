import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { ExerciseSet } from '../../exercise-sets/entities/exercise-set.entity';
import { User } from '../../users/user.entity';

export type RecordType = 'MAX_WEIGHT' | 'MAX_REPS';

@Entity('personal_records')
export class PersonalRecord {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: string;

  @Column({ type: 'bigint', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'varchar', length: 20, name: 'record_type' })
  recordType: RecordType;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'weight_kg',
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v == null ? v : parseFloat(v)),
    },
  })
  weightKg: number | null;

  @Column({ type: 'int', nullable: true })
  reps: number | null;

  @Column({ type: 'date', name: 'achieved_at' })
  achievedAt: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ type: 'bigint', name: 'source_exercise_set_id', nullable: true })
  sourceExerciseSetId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Exercise)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @ManyToOne(() => ExerciseSet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_exercise_set_id' })
  sourceExerciseSet: ExerciseSet | null;
}
