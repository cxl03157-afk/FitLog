import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1739000000002 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1739000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" BIGSERIAL NOT NULL,
        "user_id" BIGINT NOT NULL,
        "token_hash" VARCHAR(255) NOT NULL,
        "session_id" UUID NOT NULL,
        "device_name" VARCHAR(100),
        "user_agent" TEXT NOT NULL,
        "ip_address" VARCHAR(45) NOT NULL,
        "last_used_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP NOT NULL,
        "revoked_at" TIMESTAMP,
        "replaced_by_token_id" BIGINT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_refresh_tokens_replaced_by" FOREIGN KEY ("replaced_by_token_id")
          REFERENCES "refresh_tokens"("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_refresh_tokens_active_session_id" ON "refresh_tokens" ("session_id") WHERE "revoked_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user_revoked_expires" ON "refresh_tokens" ("user_id", "revoked_at", "expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_session_revoked" ON "refresh_tokens" ("session_id", "revoked_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_session_revoked"`);
    await queryRunner.query(
      `DROP INDEX "idx_refresh_tokens_user_revoked_expires"`,
    );
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_token_hash"`);
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_user_id"`);
    await queryRunner.query(
      `DROP INDEX "idx_refresh_tokens_active_session_id"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
