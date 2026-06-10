# FitLog 実装フェーズ計画（Phase 1〜18）

筋トレ・運動記録SNS「FitLog」の全フェーズ計画。
技術スタック詳細は `docs/tech-stack.md`、ER図は `docs/database.md`、画面仕様は `docs/screens.md` を参照。

---

## フェーズ一覧

| # | フェーズ名 | 主要成果物 | 状態 |
|---|-----------|-----------|------|
| 1 | 要件定義・設計ドキュメント作成 | CLAUDE.md、docs/ 各仕様書 | 完了 |
| 2 | 静的プロトタイプ（Mock）作成 | mock/ 11画面 HTML/CSS/JS | 完了 |
| 3 | ローカル開発環境構築 | docker-compose、ESLint、Jest/Vitest、CI基盤 | 完了 |
| 4 | バックエンド基盤 + JWT認証 | NestJS 認証モジュール、RefreshToken（セッション単位） | 完了 |
| 5 | バックエンド API 作成 | 8機能分の migration/Entity/Service/Controller + Jestテスト | 未着手 |
| 6 | フロントエンド基盤 | React Router、Axiosクライアント、トークン管理、Context API | 未着手 |
| 7 | フロントエンド タイムライン・投稿 | タイムライン・投稿作成・投稿詳細画面 | 未着手 |
| 8 | フロントエンド コメント・ナイス | コメント・ナイス実装、Vitestテスト | 未着手 |
| 9 | S3 画像アップロード | LocalStack/S3統合、投稿・アバター画像API | 未着手 |
| 10 | フロントエンド フォロー・プロフィール | プロフィール・ユーザー検索・デバイス管理 | 未着手 |
| 11 | 週間/月間集計・目標設定 | 集計画面・目標管理UI・グラフ表示 | 未着手 |
| 12 | API仕様書・Swagger整備 | Swagger自動生成確認、docs/ との整合確認 | 未着手 |
| 13 | アプリ全体の調整 | UI/UX・エラーハンドリング・バリデーション・Playwright E2E | 未着手 |
| 14 | ログ設計・ローカル確認 | NestJS Logger（JSON形式）、各種ログ出力確認 | 未着手 |
| 15 | パフォーマンステスト | N+1問題確認、DBインデックス、k6/Artillery ロードテスト | 未着手 |
| 16 | AWS環境構築 | EC2・RDS・S3・CloudFront・ALB・CloudWatch Logs | 未着手 |
| 17 | CI/CD | GitHub Actions（S3 sync・EC2デプロイ・CloudFront invalidation） | 未着手 |
| 18 | 実動作確認・最終調整 | マルチデバイス検証、ドキュメント最終化、doc-sync | 未着手 |

---

## 各フェーズ詳細

### Phase 5：バックエンド API 作成

機能ごとに migration + Entity + Repository + Service + Controller を実装。
各 API に Jest ユニットテストを追加し、CI で実行。

| 機能 | 主なエンドポイント |
|------|----------------|
| 種目マスタ | GET `/api/exercises` |
| トレーニング投稿 | GET/POST `/api/workout-posts`、GET/PUT/DELETE `/api/workout-posts/:id` |
| セット記録 | POST `/api/workout-exercises/:exerciseId/sets`、PUT/DELETE `/api/exercise-sets/:setId` |
| コメント | GET/POST `/api/workout-posts/:id/comments`、DELETE `/api/comments/:id` |
| ナイス | POST/DELETE `/api/workout-posts/:id/likes`、GET `/api/workout-posts/:id/likes/count` |
| フォロー | POST/DELETE `/api/follows/:userId`、GET `/api/users/:id/followers`、GET `/api/users/:id/following` |
| 目標設定 | GET/POST `/api/goals`、PUT/DELETE `/api/goals/:id` |
| 集計 | GET `/api/stats/weekly`、GET `/api/stats/monthly` |

- 認可テストを必須化（他人データの更新・削除は常に 403/404 で拒否）

---

### Phase 6：フロントエンド基盤

- React Router v6 でルーティング設定
- Axios ベースの API クライアント（型付き、AccessToken 自動付与・401 時に RefreshToken 使用してリトライ）
- JWT トークン管理（AccessToken: メモリ、RefreshToken: httpOnly Cookie）
- 認証状態管理（Context API）
- 未認証ルートのリダイレクト保護
- GitHub Actions CI（フロントエンド）: Lint + Vitest + Build 実行

---

### Phase 7：フロントエンド タイムライン・投稿機能

- タイムライン画面（全体投稿一覧。フォロー中タイムラインへの切り替えは Phase 10 で実装）
- トレーニング投稿作成画面（種目追加・セット入力フォーム）
- 投稿詳細画面
- CI: Vitest コンポーネントテスト追加

---

### Phase 8：フロントエンド コメント・ナイス機能

- コメント投稿・一覧表示
- ナイス！追加・解除・カウント表示（アニメーション）
- CI: Vitest コンポーネントテスト追加

---

### Phase 9：S3 画像アップロード

**ローカル開発:** docker-compose に LocalStack を追加して S3 をエミュレート
**本番:** Phase 16 で実際の AWS S3 + CloudFront に切り替え（環境変数のエンドポイント URL 変更のみ）

S3 object key パスルール（単一バケット構成）:
```
/                          ← React SPA (index.html)
/assets/*                  ← React ビルド成果物
/images/posts/{postId}/    ← 投稿画像
/images/avatars/{userId}/  ← アバター画像
```

- 投稿画像アップロード API（最大4枚）+ 投稿削除時に S3 ファイルも連動削除
- アバター画像アップロード API
- アップロード方式: Multer + AWS SDK v3 によるサーバー中継方式

---

### Phase 10：フロントエンド フォロー・プロフィール機能

- プロフィール画面（投稿一覧・フォロワー数・フォロー数）
- プロフィール編集（表示名・自己紹介・アバター画像）
- ユーザー検索画面
- フォロー中タイムライン切り替え
- フォロー一覧画面
- ログイン中デバイス管理（セッション一覧・個別端末ログアウト・全端末ログアウト）

---

### Phase 11：週間/月間集計・目標設定

- 集計画面（週間/月間トレーニング回数・ボリューム グラフ表示）
- 種目別集計（種目ごとの最大重量推移）
- 目標設定画面（種目・目標重量・目標回数・期限）
- 達成状況表示（IN_PROGRESS / ACHIEVED / ABANDONED）
- CI: 集計ロジックのユニットテスト追加

---

### Phase 12：API仕様書・Swagger整備

- Swagger 自動生成の確認・整備（`@ApiProperty` デコレーター補完）
- API 仕様と機能定義書（`docs/features/`）との整合確認
- `/code-review` スキルで実装↔ドキュメント差異チェック
- README に Swagger UI への導線追加

---

### Phase 13：アプリ全体の調整

- UI/UX 調整（Tailwind CSS 統一・レスポンシブ対応）
- エラーハンドリング統一（NestJS ExceptionFilter）
- バリデーション強化（class-validator）
- Playwright E2E テスト追加（主要ユースケース）

---

### Phase 14：ログ設計・ローカル確認

- NestJS Logger モジュール設定（ログレベル: debug / log / warn / error）
- ログフォーマット統一（JSON形式、timestamp・level・context・message）
- リクエストロギング（全 API リクエストの method・path・status・latency）
- エラーログ（ExceptionFilter でスタックトレース出力）
- 認証失敗ログ（401 時にユーザー特定情報なしで記録）
- ローカルでログ出力確認（CloudWatch 連携は Phase 16 で実施）

---

### Phase 15：パフォーマンステスト

- 一覧取得 API（タイムライン・集計）の N+1 問題確認
- TypeORM の Join/EagerLoading 設定見直し
- DB インデックス確認（workout_posts.user_id、likes.workout_post_id 等）
- k6 または Artillery で API ロードテスト

---

### Phase 16：AWS 環境構築

本番インフラ構成:
```
CloudFront（単一ディストリビューション）
├── /api/*      → ALB → EC2（Docker: docker compose up）
├── /assets/*   → S3（React ビルド成果物、長期キャッシュ）
├── /images/*   → S3（投稿画像・アバター、OAC）
└── /*          → S3（React SPA index.html）

RDS PostgreSQL 17（プライベートサブネット）
CloudWatch Logs（NestJS アプリログ転送）
```

主な作業:
- EC2（Amazon Linux 2023）セットアップ、Docker インストール
- RDS PostgreSQL 17 作成（プライベートサブネット）
- S3 バケット作成（OAC + CloudFront）
- ALB 設定、セキュリティグループ設定
- SSM Parameter Store で環境変数管理
- CloudWatch Logs 連携
- LocalStack → 実際の AWS S3 切り替え（環境変数変更のみ）

---

### Phase 17：CI/CD

**フロントエンド CD（GitHub Actions）:**
1. `npm run build`
2. S3 sync（`--delete --exclude "images/*"` でユーザー画像を保護）
3. CloudFront cache invalidation（`aws cloudfront create-invalidation --paths "/*"`）

**バックエンド CD（GitHub Actions）:**
1. ECR push → EC2 で `docker compose pull && docker compose up -d`

共通: main ブランチへのマージをトリガー、必要に応じて手動承認フロー追加

---

### Phase 18：実動作確認・最終調整

- 本番相当環境での全ユースケース動作確認
- スマートフォン表示確認（Tailwind レスポンシブ）
- マルチデバイス E2E 確認（2端末同時ログイン・片方のみ失効・全端末失効・失効済みトークン再利用拒否）
- README / docs/ の最終更新
- doc-sync スキルで実装↔ドキュメント最終整合チェック
