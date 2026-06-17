@docs/context.md

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
- **`stash` を使う場合はユーザーへ承認確認を行う**（意図が不明確なら WIP コミットで代替）
- `stash` を使う場合は必ずメッセージ付きで保存する（`git stash push -m "wip: ..."` 必須）
- 既存の作業ブランチで `git stash apply` / `git stash pop` を直接実行しない
- `stash pop` は禁止。展開は `git stash branch temp/<name> stash@{n}` で別ブランチに出してから確認する
- `stash` 適用前に `git status --porcelain` が空（クリーン）であることを必ず確認する
- 未追跡ファイルがある状態で `stash` を適用しない
- 作業終了時は `git status` が意図どおり（コミット済み or 変更保留を明示）か確認してからブランチを離れる
- **push 前にも `git status` でクリーン（またはコミット済み）であることを確認する**

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
  | Issue 作成 | Claude Code | **Issue 案（タイトル・目的・完了条件）をユーザーへ提示し承認を得てから発行する** |
  | 実装 | Claude Code | 承認後に実装・テスト。**コミット前にユーザーへ diff とメッセージ案を提示し承認を得る** |
  | テスト報告 | Claude Code | **テスト完了後、ファイル名・ケース名・pass/fail を含む詳細結果をユーザーへ報告する** |
  | セルフレビュー | Claude Code | `/code-review` で diff を確認、指摘を解消 |
  | PR 作成 | Claude Code | **`git status` でクリーンを確認 → PR 案をユーザーへ提示し承認を得てから作成する** |
  | docs 更新 | Claude Code | **CI グリーン確認後、docs 更新内容をユーザーへ提示し承認を得てからコミットする** |
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

### バックエンドコミット前チェックリスト

バックエンドの変更をコミットする前に以下の順でパスさせること：

```bash
cd backend && npm run lint   # 1. lint
cd backend && npm test       # 2. テスト
cd backend && npm run build  # 3. TS 型チェック（必須）
```

- **lint + test が通っただけで CI グリーン相当と判断しない**
- ts-jest は型チェックを部分的にスキップするため `npm run build` でしか検出できないエラーがある
  （例: TS1272 isolatedModules エラー、TS2559 TypeORM relations 型エラー）

### 新規エンドポイント追加時の追加チェック

create / update / delete 系エンドポイントを新規追加した場合は以下も必須：

1. **統合テストにそのフローを1件追加する**
   - ユニットテストはリポジトリをモックするため、`dataSource.transaction()` 内の
     コネクション不整合バグ等は統合テストでしか検出できない
   - `cd backend && npx jest --config ./test/jest-integration.json --runInBand --forceExit`

2. **Swagger または curl で実際にリクエストを送り、レスポンスを目視確認する**
   - Swagger UI: `http://localhost:3000/api/docs`
   - curl 例（create の場合）:
     ```bash
     curl -s -X POST http://localhost:3000/api/workout-posts \
       -H "Authorization: Bearer <token>" \
       -H "Content-Type: application/json" \
       -d '{"title":"テスト","trainedOn":"2026-06-17","exercises":[...]}' | jq .
     ```
   - レスポンスに期待するリレーション（exercises, sets 等）が含まれているか確認する
