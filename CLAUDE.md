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

## PRレビュー運用（必須ゲート）

- PR 作成後の最初の `NextAction` は必ず「レビュー実施」にする
- マージ前に以下3点をすべて満たすこと
  - レビュー承認済み（指摘対応完了を含む）
  - CI グリーン（Backend CI / Frontend CI）
  - Issue 紐付けが有効（`Closes #...`）
- 上記が揃うまでマージしない
- `docs/handoff.md` で `ReviewStatus` と `MergeReadiness` を更新し、状態を可視化する

## Git安全運用（stash衝突防止）

- 退避の第一選択は `stash` ではなく「作業ブランチへの WIP コミット」にする
- `stash` を使う場合は必ずメッセージ付きで保存する（例: `git stash push -u -m "wip: ..."`）
- 既存の作業ブランチで `git stash apply` / `git stash pop` を直接実行しない
- `stash` を展開するときは `git stash branch <branch-name> stash@{n}` を優先し、別ブランチで確認する
- `stash` 適用前に `git status --porcelain` が空（クリーン）であることを必ず確認する
- 未追跡ファイルがある状態で `stash` を適用しない
- `stash pop` は禁止し、`apply` で確認後に問題なければ `drop` する
- 作業終了時は `git status` が意図どおり（コミット済み or 変更保留を明示）か確認してからブランチを離れる

## エージェントがこのルールを適用するタイミング

- 新しい機能・修正の実装を依頼されたとき → Issue 作成を提案する
- コミット・プッシュを依頼されたとき → 作業ブランチ上にいるか確認する
- PR 作成を依頼されたとき → Issue 番号を PR に紐付ける

## Claude Code 単独運用

- **Claude Code（Cursor 拡張）** が計画・実装・レビュー・Issue / handoff 管理をすべて担う
- 外部サブエージェント（Codex / Composer）は使用しない
- フェーズの進め方：

  | ステップ | 担当 | 内容 |
  |---------|------|------|
  | 計画 | Claude Code | docs/context.md を読み、NextAction を1つ提案 |
  | 実装 | Claude Code | 承認後に実装・テスト。**コミット前にユーザーへ diff とメッセージ案を提示し承認を得る** |
  | セルフレビュー | Claude Code | `/code-review` で diff を確認、指摘を解消 |
  | マージ | ユーザー承認 | CI グリーン・レビュー承認後にユーザーがマージ |

- `docs/context.md` はフェーズ切替時に必ず最新化する（NextAction・Phase・Branch を書き換える）
- `docs/handoff.md` の更新は **マージ前に同 PR へ追加する**。ただし `docs/**` は CI の `paths` フィルター対象外のためワークフローは動作しない

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
- ポート競合が発生した場合は、まず `lsof -i:<port>` で使用中プロセスを確認し、問題なければ `lsof -ti:<port> | xargs kill` で終了する。通常終了できない場合のみ `kill -9` を使う

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
| バックエンド統合テスト | Jest | `cd backend && npx jest --config ./test/jest-integration.json --runInBand --forceExit` |
| フロントエンドユニットテスト | Vitest | `cd frontend && npm test` |
| E2E テスト | Playwright | `cd frontend && npx playwright test` |
