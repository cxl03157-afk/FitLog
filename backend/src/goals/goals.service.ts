import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { Goal } from './entities/goal.entity';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
  ) {}

  findAll(userId: string, status?: string): Promise<Goal[]> {
    const where: Record<string, unknown> = { userId };
    if (status) where['status'] = status;
    return this.goalRepository.find({
      where,
      relations: ['exercise'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateGoalDto, userId: string): Promise<Goal> {
    const goal = this.goalRepository.create({
      userId,
      exerciseId: dto.exerciseId,
      targetWeightKg: dto.targetWeightKg ?? null,
      targetReps: dto.targetReps ?? null,
      deadline: dto.deadline ?? null,
      status: 'IN_PROGRESS',
    });
    return this.goalRepository.save(goal);
  }

  async update(id: string, dto: UpdateGoalDto, userId: string): Promise<Goal> {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) throw new NotFoundException(`Goal ${id} not found`);
    if (goal.userId !== userId) throw new ForbiddenException('Cannot update another user\'s goal');
    if (goal.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cannot update a completed goal');
    }

    const updates: Partial<Goal> = {};
    if (dto.status) {
      updates.status = dto.status;
      if (dto.status === 'ACHIEVED') updates.achievedAt = new Date();
    }
    if (dto.deadline !== undefined) updates.deadline = dto.deadline;

    await this.goalRepository.update(id, updates);
    return this.goalRepository.findOne({ where: { id }, relations: ['exercise'] }) as Promise<Goal>;
  }

  async remove(id: string, userId: string): Promise<void> {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) throw new NotFoundException(`Goal ${id} not found`);
    if (goal.userId !== userId) throw new ForbiddenException('Cannot delete another user\'s goal');
    await this.goalRepository.delete(id);
  }
}
