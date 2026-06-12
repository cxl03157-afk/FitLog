import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersonalRecordsTable1739000000012 implements MigrationInterface {
  name = 'CreatePersonalRecordsTable1739000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "personal_records" (
        "id" BIGSERIAL NOT NULL,
        "user_id" BIGINT NOT NULL,
        "exercise_id" BIGINT NOT NULL,
        "record_type" VARCHAR(20) NOT NULL,
        "weight_kg" DECIMAL(6,2),
        "reps" INT,
        "achieved_at" DATE NOT NULL,
        "note" VARCHAR(200),
        "source_exercise_set_id" BIGINT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_personal_records_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_personal_records_record_type" CHECK (record_type IN ('MAX_WEIGHT', 'MAX_REPS')),
        CONSTRAINT "FK_personal_records_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_personal_records_exercise_id" FOREIGN KEY ("exercise_id")
          REFERENCES "exercises"("id"),
        CONSTRAINT "FK_personal_records_source_exercise_set_id" FOREIGN KEY ("source_exercise_set_id")
          REFERENCES "exercise_sets"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_personal_records_user_id" ON "personal_records" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_personal_records_exercise_id" ON "personal_records" ("exercise_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_personal_records_exercise_id"`);
    await queryRunner.query(`DROP INDEX "idx_personal_records_user_id"`);
    await queryRunner.query(`DROP TABLE "personal_records"`);
  }
}
