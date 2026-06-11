import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoalsTable1739000000011 implements MigrationInterface {
  name = 'CreateGoalsTable1739000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "goals" (
        "id" BIGSERIAL NOT NULL,
        "user_id" BIGINT NOT NULL,
        "exercise_id" BIGINT NOT NULL,
        "target_weight_kg" DECIMAL(6,2),
        "target_reps" INT,
        "deadline" DATE,
        "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
        "achieved_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_goals_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_goals_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_goals_exercise_id" FOREIGN KEY ("exercise_id")
          REFERENCES "exercises"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_goals_user_id" ON "goals" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_goals_user_id"`);
    await queryRunner.query(`DROP TABLE "goals"`);
  }
}
