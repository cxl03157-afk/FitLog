# 機能一覧

## 機能サマリー

| カテゴリ | 機能 | 詳細 |
|---------|------|------|
| 認証 | 新規登録・ログイン・ログアウト・プロフィール・セッション管理 | [docs/features/01_auth.md](features/01_auth.md) |
| トレーニング投稿 | 記録作成・一覧・詳細・削除 | [docs/features/02_workout_post.md](features/02_workout_post.md) |
| ナイス！ | 追加・解除・カウント表示 | [docs/features/03_like.md](features/03_like.md) |
| コメント | 投稿・一覧・削除 | [docs/features/04_comment.md](features/04_comment.md) |
| フォロー | フォロー・解除・一覧・検索 | [docs/features/05_follow.md](features/05_follow.md) |
| 集計 | 週間・月間・種目別グラフ | [docs/features/06_statistics.md](features/06_statistics.md) |
| 目標設定 | 目標の作成・達成管理 | [docs/features/07_goal.md](features/07_goal.md) |

---

## ユースケース一覧

| UC-ID | ユースケース | アクター | 機能定義書 |
|-------|------------|---------|-----------|
| UC-01 | 新規ユーザー登録 | 未認証ユーザー | 01_auth |
| UC-02 | ログイン | 未認証ユーザー | 01_auth |
| UC-03 | ログアウト | 認証済みユーザー | 01_auth |
| UC-04 | AccessToken リフレッシュ | 認証済みユーザー（自動） | 01_auth |
| UC-05 | プロフィール表示 | 認証済みユーザー | 01_auth |
| UC-06 | プロフィール編集 | 認証済みユーザー（自分のみ） | 01_auth |
| UC-07 | トレーニング記録投稿 | 認証済みユーザー | 02_workout_post |
| UC-08 | タイムライン閲覧 | 認証済みユーザー | 02_workout_post |
| UC-09 | 投稿詳細閲覧 | 認証済みユーザー | 02_workout_post |
| UC-10 | 投稿削除 | 認証済みユーザー（自分の投稿のみ） | 02_workout_post |
| UC-11 | ナイス！追加 | 認証済みユーザー | 03_like |
| UC-12 | ナイス！解除 | 認証済みユーザー（自分がナイスした投稿のみ） | 03_like |
| UC-13 | コメント投稿 | 認証済みユーザー | 04_comment |
| UC-14 | コメント削除 | 認証済みユーザー（自分のコメントのみ） | 04_comment |
| UC-15 | フォロー | 認証済みユーザー（他ユーザーのみ） | 05_follow |
| UC-16 | フォロー解除 | 認証済みユーザー | 05_follow |
| UC-17 | ユーザー検索 | 認証済みユーザー | 05_follow |
| UC-18 | フォロー一覧閲覧 | 認証済みユーザー | 05_follow |
| UC-19 | 週間・月間集計閲覧 | 認証済みユーザー | 06_statistics |
| UC-20 | 種目別集計閲覧 | 認証済みユーザー | 06_statistics |
| UC-21 | 目標設定 | 認証済みユーザー | 07_goal |
| UC-22 | 目標達成・放棄 | 認証済みユーザー（自分の目標のみ） | 07_goal |
| UC-23 | ログイン中セッション一覧取得 | 認証済みユーザー（自分のみ） | 01_auth |
| UC-24 | 指定セッションのログアウト | 認証済みユーザー（自分のみ） | 01_auth |
| UC-25 | 全端末ログアウト | 認証済みユーザー（自分のみ） | 01_auth |

---

## API エンドポイント一覧

| メソッド | パス | 機能 | 認証 |
|---------|------|------|------|
| POST | `/api/auth/register` | 新規登録 | 不要 |
| POST | `/api/auth/login` | ログイン | 不要 |
| POST | `/api/auth/refresh` | AccessToken リフレッシュ | Cookie（RefreshToken） |
| POST | `/api/auth/logout` | ログアウト | 必要 |
| GET | `/api/auth/sessions` | ログイン中セッション一覧 | 必要 |
| DELETE | `/api/auth/sessions/:sessionId` | 指定端末ログアウト | 必要 |
| DELETE | `/api/auth/sessions` | 全端末ログアウト | 必要 |
| GET | `/api/users/search` | ユーザー検索 | 必要 |
| GET | `/api/users/:id` | プロフィール取得 | 必要 |
| PATCH | `/api/users/me/profile` | プロフィール更新 | 必要 |
| PATCH | `/api/users/me/avatar` | アバター画像アップロード | 必要 |
| GET | `/api/users/:id/followers` | フォロワー一覧 | 必要 |
| GET | `/api/users/:id/following` | フォロー中一覧 | 必要 |
| POST | `/api/follows/:userId` | フォロー | 必要 |
| DELETE | `/api/follows/:userId` | フォロー解除 | 必要 |
| GET | `/api/exercises` | 種目マスタ一覧 | 必要 |
| GET | `/api/workout-posts` | 投稿一覧（タイムライン） | 必要 |
| POST | `/api/workout-posts` | 投稿作成 | 必要 |
| GET | `/api/workout-posts/:id` | 投稿詳細 | 必要 |
| PUT | `/api/workout-posts/:id` | 投稿更新 | 必要 |
| DELETE | `/api/workout-posts/:id` | 投稿削除 | 必要 |
| POST | `/api/workout-posts/:id/images` | 画像アップロード | 必要 |
| POST | `/api/workout-exercises/:exerciseId/sets` | セット追加 | 必要 |
| PUT | `/api/exercise-sets/:setId` | セット更新 | 必要 |
| DELETE | `/api/exercise-sets/:setId` | セット削除 | 必要 |
| GET | `/api/workout-posts/:id/comments` | コメント一覧 | 必要 |
| POST | `/api/workout-posts/:id/comments` | コメント追加 | 必要 |
| DELETE | `/api/comments/:id` | コメント削除 | 必要 |
| POST | `/api/workout-posts/:id/likes` | ナイス！追加 | 必要 |
| DELETE | `/api/workout-posts/:id/likes` | ナイス！解除 | 必要 |
| GET | `/api/workout-posts/:id/likes/count` | ナイス！数取得 | 必要 |
| GET | `/api/stats/weekly` | 週間集計 | 必要 |
| GET | `/api/stats/monthly` | 月間集計 | 必要 |
| GET | `/api/goals` | 目標一覧 | 必要 |
| POST | `/api/goals` | 目標作成 | 必要 |
| PUT | `/api/goals/:id` | 目標更新 | 必要 |
| DELETE | `/api/goals/:id` | 目標削除 | 必要 |
| GET | `/api/health` | ヘルスチェック | 不要 |
