import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedStandardExercises1739000000013 implements MigrationInterface {
  name = 'SeedStandardExercises1739000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO exercises (name, category)
      SELECT v.name, v.category
      FROM (
        VALUES
          ('ベンチプレス',               '胸'),
          ('インクラインベンチプレス',   '胸'),
          ('ダンベルプレス',             '胸'),
          ('ダンベルフライ',             '胸'),
          ('デッドリフト',               '背中'),
          ('ベントオーバーロウ',         '背中'),
          ('ラットプルダウン',           '背中'),
          ('シーテッドロウ',             '背中'),
          ('懸垂',                       '背中'),
          ('スクワット',                 '脚'),
          ('レッグプレス',               '脚'),
          ('レッグカール',               '脚'),
          ('ルーマニアンデッドリフト',   '脚'),
          ('カーフレイズ',               '脚'),
          ('ショルダープレス',           '肩'),
          ('サイドレイズ',               '肩'),
          ('リアレイズ',                 '肩'),
          ('バーベルカール',             '腕'),
          ('ハンマーカール',             '腕'),
          ('トライセプスプッシュダウン', '腕'),
          ('プランク',                   '体幹'),
          ('クランチ',                   '体幹'),
          ('レッグレイズ',               '体幹')
      ) AS v(name, category)
      WHERE NOT EXISTS (
        SELECT 1
        FROM exercises e
        WHERE LOWER(TRIM(e.name)) = LOWER(TRIM(v.name))
      )
    `);
  }

  public async down(): Promise<void> {
    // 意図的な no-op。
    // WHERE NOT EXISTS 方式では、Migrationで追加した行と既存行を
    // IDで安全に区別できない。
    // また、標準種目は workout_exercises / goals / personal_records から
    // 参照されている可能性があり、削除前に参照確認が必要となるため、
    // 自動削除すると既存データを壊すリスクがある。
    // rollback時にもseedデータを削除しない。
  }
}
