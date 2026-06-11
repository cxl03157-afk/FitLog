import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExercisesTable1739000000003 implements MigrationInterface {
  name = 'CreateExercisesTable1739000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exercises" (
        "id" BIGSERIAL NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "category" VARCHAR(50) NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exercises_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exercises"`);
  }
}
