import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkoutExercisesTable1739000000005 implements MigrationInterface {
  name = 'CreateWorkoutExercisesTable1739000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workout_exercises" (
        "id" BIGSERIAL NOT NULL,
        "workout_post_id" BIGINT NOT NULL,
        "exercise_id" BIGINT NOT NULL,
        "order_index" INT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workout_exercises_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workout_exercises_post_id" FOREIGN KEY ("workout_post_id")
          REFERENCES "workout_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workout_exercises_exercise_id" FOREIGN KEY ("exercise_id")
          REFERENCES "exercises"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_workout_exercises_post_id" ON "workout_exercises" ("workout_post_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_workout_exercises_post_id"`);
    await queryRunner.query(`DROP TABLE "workout_exercises"`);
  }
}
