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
import { User } from '../../users/user.entity';

export type GoalStatus = 'IN_PROGRESS' | 'ACHIEVED' | 'ABANDONED';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: string;

  @Column({ type: 'bigint', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'target_weight_kg', nullable: true })
  targetWeightKg: number | null;

  @Column({ type: 'int', name: 'target_reps', nullable: true })
  targetReps: number | null;

  @Column({ type: 'date', nullable: true })
  deadline: string | null;

  @Column({ type: 'varchar', length: 20, default: 'IN_PROGRESS' })
  status: GoalStatus;

  @Column({ type: 'timestamp', name: 'achieved_at', nullable: true })
  achievedAt: Date | null;

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
}
