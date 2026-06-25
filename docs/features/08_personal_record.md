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
| sourceExerciseSetId | − | 参照元セットの ID（任意）。自分が所有する exercise_set かつ同じ exerciseId に属するもののみ指定可。**初期 UI 対象外（将来対応・別 Issue 候補）** |

### recordType の変更制限（Phase 13-1 追加）

- `recordType` は作成後に変更不可
- PUT で **既存値と異なる** `recordType` を指定 → `400 BadRequestException`
- PUT で **既存値と同じ** `recordType` を送信 → 許可（エラーなし）
- フロントエンドの更新ペイロードには `recordType` を含めない（変更不可のため省略）

### exerciseId の変更制限

- `exerciseId` は `UpdatePersonalRecordDto` に存在しない
- PUT リクエストに `exerciseId` を含めても ValidationPipe（whitelist: true）により除去される
- フロントエンドの更新ペイロードには `exerciseId` を含めない

### note フィールドの update 挙動

- `null` を指定 → DB に null を保存（メモ削除）
- `undefined`（未指定） → 既存の note を維持
- `""` → 空文字列として保存
- フロントエンドでは note 欄を空白にして保存すると `null` を送信する（削除として扱う）

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

### レスポンス例（POST 登録直後）

> **登録直後のレスポンスには `exercise` リレーションを含まない。**
> `exercise` が必要な場合は直後に `GET /api/personal-records/:id` を呼ぶこと。

```json
{
  "id": "1",
  "userId": "42",
  "exerciseId": "10",
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

### レスポンス例（GET 一覧・詳細 / PUT 更新後）

> GET および PUT のレスポンスには `exercise` リレーション（id / name / category）が含まれる。

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

未指定フィールドは既存値を維持する。`exerciseId` と `recordType` は変更不可のため含めない。

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

---

## フロントエンド UI（Phase 13-1 実装済み）

### ルート

| パス | 認証 | コンポーネント |
|------|------|--------------|
| `/personal-records` | 必須（ProtectedRoute） | `frontend/src/pages/PersonalRecordsPage.tsx` |

NavBar に「PR記録」テキストリンクを追加済み（`frontend/src/components/NavBar.tsx`）。

### 画面仕様

| 状態 | 表示 |
|------|------|
| 読み込み中 | 「読み込み中...」テキスト |
| 0件 | 「まだパーソナルレコードがありません」 |
| 取得失敗 | ページ内エラーメッセージ（ブロッキング） |
| 一覧表示 | 種目名・recordType・重量または回数・達成日・note |

### モーダル仕様（新規登録 / 編集）

| 項目 | 新規登録 | 編集 |
|------|---------|------|
| 種目 | セレクト（`{name}（{category}）` 形式） | read-only テキスト表示（変更不可） |
| recordType | ラジオ選択（最大重量 / 最大回数） | read-only テキスト表示（変更不可） |
| 重量（kg） | MAX_WEIGHT 時のみ表示・必須 | 同左 |
| 回数（回） | MAX_REPS 時のみ表示・必須 | 同左 |
| 達成日 | date 入力・必須 | 同左 |
| note | テキストエリア・任意（最大200文字）・空欄で null を送信 | 同左 |

### 数値入力バリデーション

`Number() + Number.isFinite()` による厳密検証:
- `weightKg`: 0 以上の有限数（空欄 / 不正文字列 / Infinity → API 呼ばない）
- `reps`: 1 以上の整数（空欄 / 小数 / 0以下 / 不正文字列 → API 呼ばない）

### 削除確認

- 「削除」ボタン → 行内に「本当に削除しますか？ [はい][いいえ]」を展開
- 「はい」押下直後に確認UIを閉じ、元の「削除」ボタンを disabled にして二重削除を防止

### 操作結果の通知

| 操作 | 成功 | 失敗 |
|------|------|------|
| 登録 API | 5秒バナー（成功） | モーダル内エラー表示 |
| 更新 API | 5秒バナー（成功） | モーダル内エラー表示 |
| 削除 API | 5秒バナー（成功） | 5秒バナー（エラー） |
| 操作後の再取得失敗 | — | 5秒バナー（エラー） |

### sourceExerciseSetId

初期 UI の対象外。将来対応・別 Issue 候補。

### テストファイル

| 種別 | パス |
|------|------|
| Unit test（Vitest） | `frontend/src/test/PersonalRecordsPage.test.tsx`（29件） |
| E2E（Playwright） | `frontend/e2e/phase13.spec.ts`（シナリオ 1〜2） |
