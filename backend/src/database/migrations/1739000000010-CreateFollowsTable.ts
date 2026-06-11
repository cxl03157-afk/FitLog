import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFollowsTable1739000000010 implements MigrationInterface {
  name = 'CreateFollowsTable1739000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "follows" (
        "id" BIGSERIAL NOT NULL,
        "follower_id" BIGINT NOT NULL,
        "followee_id" BIGINT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follows_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_follows_follower_followee" UNIQUE ("follower_id", "followee_id"),
        CONSTRAINT "CHK_follows_no_self_follow" CHECK ("follower_id" <> "followee_id"),
        CONSTRAINT "FK_follows_follower_id" FOREIGN KEY ("follower_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follows_followee_id" FOREIGN KEY ("followee_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_follows_follower_id" ON "follows" ("follower_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_follows_followee_id" ON "follows" ("followee_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_follows_followee_id"`);
    await queryRunner.query(`DROP INDEX "idx_follows_follower_id"`);
    await queryRunner.query(`DROP TABLE "follows"`);
  }
}
