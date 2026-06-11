import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExerciseSetsTable1739000000006 implements MigrationInterface {
  name = 'CreateExerciseSetsTable1739000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exercise_sets" (
        "id" BIGSERIAL NOT NULL,
        "workout_exercise_id" BIGINT NOT NULL,
        "set_number" INT NOT NULL,
        "weight_kg" DECIMAL(6,2) NOT NULL,
        "reps" INT NOT NULL,
        "is_pr" BOOLEAN NOT NULL DEFAULT FALSE,
        "memo" VARCHAR(200),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exercise_sets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exercise_sets_workout_exercise_id" FOREIGN KEY ("workout_exercise_id")
          REFERENCES "workout_exercises"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_exercise_sets_workout_exercise_id" ON "exercise_sets" ("workout_exercise_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "idx_exercise_sets_workout_exercise_id"`,
    );
    await queryRunner.query(`DROP TABLE "exercise_sets"`);
  }
}
