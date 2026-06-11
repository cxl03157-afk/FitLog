import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommentsTable1739000000008 implements MigrationInterface {
  name = 'CreateCommentsTable1739000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" BIGSERIAL NOT NULL,
        "workout_post_id" BIGINT NOT NULL,
        "user_id" BIGINT NOT NULL,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_workout_post_id" FOREIGN KEY ("workout_post_id")
          REFERENCES "workout_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comments_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_comments_workout_post_id" ON "comments" ("workout_post_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_comments_workout_post_id"`);
    await queryRunner.query(`DROP TABLE "comments"`);
  }
}
