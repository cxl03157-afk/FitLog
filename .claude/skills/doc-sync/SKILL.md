---
name: doc-sync
description: Check for divergences between the current implementation and docs/ documentation. Produces a diff report of what is out of date, then asks the user whether to auto-fix the docs to match the implementation.
---

# doc-sync

実装を正として、`docs/` 配下のドキュメントとの差異を検出し、必要に応じて自動修正する。

## Phase 1: 実装の現状を調査する

以下のファイルを読み込んで実装の現状を把握する：

### フロントエンド
- `frontend/package.json` — 依存パッケージとバージョン
- `frontend/src/types/` — 型定義（User, WorkoutPost, Comment, Like, Follow 等）
- `frontend/src/pages/TimelinePage.tsx` — タイムライン表示仕様
- `frontend/src/components/WorkoutPostCard.tsx` — 投稿カードの表示仕様
- `frontend/src/pages/WorkoutPostFormPage.tsx` — 投稿フォーム UI

### バックエンド
- `backend/package.json` — 依存ライブラリとバージョン
- `backend/src/auth/**/*.ts` — 認証フロー、セッション管理 API、トークンローテーション実装
- `backend/src/users/entities/user.entity.ts` — User エンティティ
- `backend/src/workout-posts/entities/workout-post.entity.ts` — WorkoutPost エンティティ
- `backend/src/exercises/entities/exercise.entity.ts` — Exercise エンティティ
- `backend/src/exercise-sets/entities/exercise-set.entity.ts` — ExerciseSet エンティティ
- `backend/src/comments/entities/comment.entity.ts` — Comment エンティティ
- `backend/src/likes/entities/like.entity.ts` — Like エンティティ
- `backend/src/follows/entities/follow.entity.ts` — Follow エンティティ
- `backend/src/goals/entities/goal.entity.ts` — Goal エンティティ
- `backend/src/workout-posts/workout-posts.controller.ts` — REST API エンドポイント
- `backend/src/migrations/` — TypeORM マイグレーションファイル

### ドキュメント
- `docs/要件定義書.md`
- `docs/features.md`
- `docs/screens.md`
- `docs/database.md`
- `docs/tech-stack.md`
- `docs/features/01_auth.md` ～ `docs/features/07_goal.md`

## Phase 2: 差異レポートを作成する

以下の観点でドキュメントと実装を比較し、差異をまとめる：

| チェック項目 | 確認ポイント |
|-------------|-------------|
| **tech-stack.md** | ライブラリ名・バージョン、追加/削除された依存関係 |
| **features.md** | UC の基本フロー（投稿方法、ナイス操作、フォロー操作等）が実装と一致しているか |
| **screens.md** | UI コンポーネントの操作方法、エラー表示方法、画面遷移図 |
| **database.md** | テーブル定義・カラム型・制約が TypeORM Entity と一致しているか |
| **features/01_auth.md** | JWT フロー、Cookie 設定、エンドポイントが実装と一致しているか |
| **features/02_workout_post.md** | 投稿・種目・セット記録のフローが実装と一致しているか |
| **認証セッション管理** | `/api/auth/sessions` 系API、`session_id`、`replaced_by_token_id` の記載有無と実装一致 |

差異がある場合は以下の形式でレポートする：

```
## ドキュメント差異レポート

### docs/tech-stack.md
- [差異] NestJS のバージョンが「10.x」と記載されているが、実際は 10.3.2 で導入済み

### docs/database.md
- [差異] exercise_sets テーブルに is_warmup カラムが追加されているがドキュメントに未記載

...（差異がなければ「差異なし」と記載）
```

差異がない場合は「すべてのドキュメントは実装と一致しています。」と報告して終了する。

## Phase 3: 自動修正の確認

差異がある場合、ユーザーに確認する：

```
上記の差異を自動修正しますか？
- はい：実装に合わせてドキュメントを修正します
- いいえ：レポートのみで終了します
```

ユーザーが「はい」を選択した場合のみ、Phase 4 を実行する。

## Phase 4: ドキュメントを自動修正する

差異ごとに Edit ツールで該当箇所を修正する。修正の原則：

1. **実装を正とする** — コードの挙動がドキュメントに優先する
2. **未実装機能の記述は変更しない** — 将来実装予定の機能記述はそのまま残す
3. **最小変更** — 差異がある箇所のみ修正し、周辺の文章は変えない
4. **日本語を維持** — ドキュメントの言語・文体をそのまま維持する

修正完了後、変更したファイルと変更箇所の一覧を報告する。
