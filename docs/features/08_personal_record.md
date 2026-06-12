# 08 パーソナルレコード（Personal Records）

## 業務フロー

ユーザーが特定の種目で達成した自己ベストを手動で登録・管理する。

```
ユーザー
  │
  ├─ POST /api/personal-records  → 自己ベストを手動登録
  ├─ GET  /api/personal-records  → 自己ベスト一覧取得（種目・タイプでフィルタ可）
  ├─ GET  /api/personal-records/:id → 詳細取得
  ├─ PUT  /api/personal-records/:id → 記録を更新
  └─ DELETE /api/personal-records/:id → 記録を削除
```

---

## ユースケース

| ID | ユースケース | 説明 |
|----|------------|------|
| UC-31 | パーソナルレコード登録 | 種目・タイプ・値・達成日を指定して PR を登録する |
| UC-32 | パーソナルレコード更新 | 登録済みの PR の値や達成日を修正する |
| UC-33 | パーソナルレコード削除 | 誤って登録した PR を削除する |

---

## 機能要件

### record_type（Phase 5-1 対応）

| 値 | 意味 |
|----|------|
| `MAX_WEIGHT` | 最大重量（kg）。`weightKg` フィールドが必須 |
| `MAX_REPS` | 最大回数（回）。`reps` フィールドが必須 |

> **将来拡張候補（Phase 5-1 未対応）:**
> - `MAX_VOLUME`: 最大ボリューム（重量 × 回数 × セット数）
> - `ESTIMATED_1RM`: 推定最大挙上能力（1RM）

### フィールド制約

| フィールド | 必須 | 制約 |
|-----------|------|------|
| exerciseId | ✓ | 存在する exercise の ID |
| recordType | ✓ | `MAX_WEIGHT` または `MAX_REPS` |
| weightKg | 条件付き | MAX_WEIGHT 時は必須。小数点以下2桁・0以上 |
| reps | 条件付き | MAX_REPS 時は必須。1以上の整数 |
| achievedAt | ✓ | ISO 8601 日付形式（YYYY-MM-DD） |
| note | − | 最大 200 文字。null でメモ削除 |
| sourceExerciseSetId | − | 参照元セットの ID（任意）。自分が所有する exercise_set かつ同じ exerciseId に属するもののみ指定可 |

### note フィールドの update 挙動

- `null` を指定 → DB に null を保存（メモ削除）
- `undefined`（未指定） → 既存の note を維持
- `""` → 空文字列として保存

### null 更新ポリシー（PUT）

以下のフィールドへの `null` 送信は `400 Bad Request`:
- `weightKg`、`reps`、`achievedAt`、`recordType`

`note` への `null` 送信はメモ削除として許容。

### sourceExerciseSetId の所有者・整合性チェック

指定する場合、対象のセットが以下の条件を満たすこと:
1. ログインユーザーが所有する `workout_post` に紐づく `exercise_set` であること
2. そのセットの `workout_exercise.exerciseId` が `dto.exerciseId` と一致すること

---

## API 設計

### エンドポイント一覧

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/personal-records` | PR 一覧取得 | 必須 |
| POST | `/api/personal-records` | PR 登録 | 必須 |
| GET | `/api/personal-records/:id` | PR 詳細取得 | 必須 |
| PUT | `/api/personal-records/:id` | PR 更新 | 必須 |
| DELETE | `/api/personal-records/:id` | PR 削除（204） | 必須 |

全エンドポイントで JWT 認証が必要。自分以外の PR へのアクセスは 403/404 で拒否。

### GET /api/personal-records クエリパラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| exerciseId | string（任意） | 指定種目の PR のみ返す |
| recordType | string（任意） | 指定タイプの PR のみ返す |

結果は `achievedAt DESC, createdAt DESC` の順で返す。

### リクエスト例（POST）

```json
{
  "exerciseId": "10",
  "recordType": "MAX_WEIGHT",
  "weightKg": 120.5,
  "achievedAt": "2024-06-01",
  "note": "新記録！",
  "sourceExerciseSetId": "5"
}
```

### レスポンス例

```json
{
  "id": "1",
  "userId": "42",
  "exerciseId": "10",
  "exercise": {
    "id": "10",
    "name": "ベンチプレス",
    "category": "胸"
  },
  "recordType": "MAX_WEIGHT",
  "weightKg": 120.5,
  "reps": null,
  "achievedAt": "2024-06-01",
  "note": "新記録！",
  "sourceExerciseSetId": "5",
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### リクエスト例（PUT）

未指定フィールドは既存値を維持する。

```json
{
  "weightKg": 125.0,
  "note": null
}
```

---

## DB スキーマ

```sql
CREATE TABLE personal_records (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id           BIGINT NOT NULL REFERENCES exercises(id),
  record_type           VARCHAR(20) NOT NULL
                          CHECK (record_type IN ('MAX_WEIGHT', 'MAX_REPS')),
  weight_kg             DECIMAL(6,2),
  reps                  INT,
  achieved_at           DATE NOT NULL,
  note                  VARCHAR(200),
  source_exercise_set_id BIGINT REFERENCES exercise_sets(id) ON DELETE SET NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_personal_records_user_id     ON personal_records (user_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records (exercise_id);
```
