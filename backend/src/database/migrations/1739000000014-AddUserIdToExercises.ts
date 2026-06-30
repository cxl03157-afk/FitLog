import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToExercises1739000000014 implements MigrationInterface {
  name = 'AddUserIdToExercises1739000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Phase 13-3A後に蓄積した既知のintegration testアーティファクトを削除する。
    // 対象: timestamp付きの名前を持つExercise（製品データではない）。
    // 本番環境ではPOST /api/exercisesが未実装のため、これらのパターンに一致するExerciseは
    // 存在せず、以下のDELETEは全て0件で安全に通過する。
    // workout_postsは削除しない（通常データへの影響を防ぐ）。

    // Step 1-a: personal_records（NO ACTION FK）を先に削除
    await queryRunner.query(`
      DELETE FROM personal_records
      WHERE exercise_id IN (
        SELECT id FROM exercises
        WHERE name LIKE 'プレスPR統合テスト_%'
           OR name LIKE 'ベンチプレス_%'
      )
    `);

    // Step 1-b: goals（NO ACTION FK）を削除（safety net）
    await queryRunner.query(`
      DELETE FROM goals
      WHERE exercise_id IN (
        SELECT id FROM exercises
        WHERE name LIKE 'プレスPR統合テスト_%'
           OR name LIKE 'ベンチプレス_%'
      )
    `);

    // Step 1-c: workout_exercises（NO ACTION FK）を削除
    await queryRunner.query(`
      DELETE FROM workout_exercises
      WHERE exercise_id IN (
        SELECT id FROM exercises
        WHERE name LIKE 'プレスPR統合テスト_%'
           OR name LIKE 'ベンチプレス_%'
      )
    `);

    // Step 2: テストExercise本体を削除
    await queryRunner.query(`
      DELETE FROM exercises
      WHERE name LIKE 'プレスPR統合テスト_%'
         OR name LIKE 'ベンチプレス_%'
    `);

    // Step 3: user_id カラム追加（NULL = 標準種目）
    await queryRunner.query(`
      ALTER TABLE exercises ADD COLUMN user_id BIGINT
    `);

    await queryRunner.query(`
      ALTER TABLE exercises
        ADD CONSTRAINT FK_exercises_user_id
        FOREIGN KEY (user_id) REFERENCES users(id)
    `);

    // Step 4: UNIQUE INDEX 2本を追加
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_exercises_unique_standard_name
        ON exercises (LOWER(TRIM(name)))
        WHERE user_id IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_exercises_unique_name_per_user
        ON exercises (LOWER(TRIM(name)), user_id)
        WHERE user_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // INDEX・FK・user_idカラムを戻す。
    // up()で削除したテストアーティファクトは復元しない
    // （再挿入すると参照データの再構築が不可能なため）。
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_exercises_unique_name_per_user`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_exercises_unique_standard_name`,
    );
    await queryRunner.query(`
      ALTER TABLE exercises DROP CONSTRAINT IF EXISTS FK_exercises_user_id
    `);
    await queryRunner.query(`
      ALTER TABLE exercises DROP COLUMN IF EXISTS user_id
    `);
  }
}
