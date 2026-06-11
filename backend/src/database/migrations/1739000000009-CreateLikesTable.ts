import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLikesTable1739000000009 implements MigrationInterface {
  name = 'CreateLikesTable1739000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "likes" (
        "id" BIGSERIAL NOT NULL,
        "workout_post_id" BIGINT NOT NULL,
        "user_id" BIGINT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_likes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_likes_post_user" UNIQUE ("workout_post_id", "user_id"),
        CONSTRAINT "FK_likes_workout_post_id" FOREIGN KEY ("workout_post_id")
          REFERENCES "workout_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_likes_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_likes_workout_post_id" ON "likes" ("workout_post_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_likes_user_id" ON "likes" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_likes_user_id"`);
    await queryRunner.query(`DROP INDEX "idx_likes_workout_post_id"`);
    await queryRunner.query(`DROP TABLE "likes"`);
  }
}
