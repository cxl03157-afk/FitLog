import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostImagesTable1739000000007 implements MigrationInterface {
  name = 'CreatePostImagesTable1739000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "post_images" (
        "id" BIGSERIAL NOT NULL,
        "workout_post_id" BIGINT NOT NULL,
        "image_key" VARCHAR(500) NOT NULL,
        "display_order" INT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_images_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_post_images_workout_post_id" FOREIGN KEY ("workout_post_id")
          REFERENCES "workout_posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_post_images_workout_post_id" ON "post_images" ("workout_post_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_post_images_workout_post_id"`);
    await queryRunner.query(`DROP TABLE "post_images"`);
  }
}
