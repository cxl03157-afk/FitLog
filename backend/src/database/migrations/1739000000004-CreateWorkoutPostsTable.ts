import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkoutPostsTable1739000000004 implements MigrationInterface {
  name = 'CreateWorkoutPostsTable1739000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workout_posts" (
        "id" BIGSERIAL NOT NULL,
        "user_id" BIGINT NOT NULL,
        "title" VARCHAR(100) NOT NULL,
        "note" TEXT,
        "trained_on" DATE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "PK_workout_posts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workout_posts_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_workout_posts_user_id" ON "workout_posts" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workout_posts_trained_on" ON "workout_posts" ("trained_on" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workout_posts_created_at" ON "workout_posts" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_workout_posts_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_workout_posts_trained_on"`);
    await queryRunner.query(`DROP INDEX "idx_workout_posts_user_id"`);
    await queryRunner.query(`DROP TABLE "workout_posts"`);
  }
}
