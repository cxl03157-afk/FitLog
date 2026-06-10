import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1739000000001 implements MigrationInterface {
  name = 'CreateUsersTable1739000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" BIGSERIAL NOT NULL,
        "username" VARCHAR(20) NOT NULL,
        "display_name" VARCHAR(50) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "avatar_key" VARCHAR(500),
        "bio" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_username" ON "users" ("username")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_users_username"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
