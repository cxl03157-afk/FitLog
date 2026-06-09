# 開発ワークフロールール

## 作業開始前の必須手順

1. **Issue を作成する**（GitHub Issues）
   - 機能追加・バグ修正・リファクタリングを問わず、すべての作業に Issue が必要
   - Issue には「目的」「完了条件」を記載する

2. **ブランチを作成する**
   - main ブランチから作業ブランチを切る
   - 命名規則：

     | 種別 | パターン |
     |------|---------|
     | 機能追加 | `feature/issue-{番号}-{内容}` |
     | バグ修正 | `fix/issue-{番号}-{内容}` |
     | ドキュメント | `docs/issue-{番号}-{内容}` |
     | リファクタリング | `refactor/issue-{番号}-{内容}` |

## コミットメッセージ規則（Conventional Commits）

```
<type>: <概要>
```

type: `feat` / `fix` / `docs` / `refactor` / `test` / `chore`

## main ブランチへの直接プッシュ禁止

- **main に直接 push しない**（ブランチ保護で強制）
- 作業完了後は PR を作成して main にマージする
- PR 本文には必ず `Closes #イシュー番号` を記載する

## Claude Code がこのルールを適用するタイミング

- 新しい機能・修正の実装を依頼されたとき → Issue 作成を提案する
- コミット・プッシュを依頼されたとき → 作業ブランチ上にいるか確認する
- PR 作成を依頼されたとき → Issue 番号を PR に紐付ける

---

## インフラ・デプロイ関連ルール

### PR マージ前の確認
- **CI（Backend CI / Frontend CI）が通ってからマージする**
- Dockerfile を変更した場合は必ずローカルで `docker build` を実行してから PR を出す

### EC2 + Docker デプロイ
- 本番デプロイは `docker compose pull && docker compose up -d` で実施
- 環境変数は SSM Parameter Store で管理（`.env` を本番サーバーに直置きしない）
- デプロイ後は `/api/health` エンドポイントで正常起動を確認する

### S3 / CloudFront
- S3 sync は `--dryrun` で確認してから本実行する
- `--delete` を使う場合は `--exclude "images/*"` を必ず付けてユーザー画像を保護する
- CloudFront キャッシュ invalidation は `aws cloudfront create-invalidation --paths "/*"` で実施

### ローカル開発環境
- PostgreSQL は Docker Compose で起動（ポート 5432）
- LocalStack は Docker Compose で起動（ポート 4566）
- バックエンド（NestJS）は port 3000
- フロントエンド（Vite）は port 5173
- ポート競合が発生した場合は `lsof -ti:<port> | xargs kill -9` で解消する

### Docker build 事前検証
- Dockerfile 変更時は `docker build` をローカルで必ず実行してから PR を出す

---

## NestJS 固有ルール

- 読み取り専用メソッドには `@Get` 系を使い、副作用のある処理には適切なメソッドを使う
- TypeORM の N+1 問題は `QueryBuilder` または `relations` オプションで解消する
- JWT 検証が必要なエンドポイントには `@UseGuards(JwtAuthGuard)` を付ける
- 新しいモジュールは `nest generate module <name>` で作成する

---

## テスト方針

| 種別 | ツール | 実行コマンド |
|------|--------|------------|
| バックエンドユニットテスト | Jest | `cd backend && npm test` |
| フロントエンドユニットテスト | Vitest | `cd frontend && npm test` |
| E2E テスト | Playwright | `cd frontend && npx playwright test` |
