# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **3**（ローカル開発環境構築）
- Issue: **#6**
- Branch: `feature/issue-6-phase3-dev-env`
- Status: 実装完了・コミット済み（PR 作成前にユーザー確認待ち）

## 技術スタック

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM（DataSource 雛形まで、DB 接続は Phase 4）
- DB: PostgreSQL 17（docker-compose）※ LocalStack は Phase 9
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 3 確定決定事項

| 項目 | 決定 |
|------|------|
| docker-compose | PostgreSQL 17 のみ |
| CI 範囲 | Lint + 型チェック + テスト（Jest/Vitest）|
| TypeORM | パッケージ導入 + DataSource 設定雛形 |
| Node バージョン | CI で強制（`actions/setup-node@v4` + `.nvmrc`）|
| Tailwind | v3（`tailwind.config.js` + `postcss.config.js`）|

## NextAction

ユーザー承認後、`feature/issue-6-phase3-dev-env` から PR を作成する（`Closes #6`）。

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 全体計画: `/Users/user/.claude/plans/it-fitlog-er-noble-river.md`
- Phase 3 詳細計画: `/Users/user/.cursor/plans/phase_3_dev_env_plan_86ceed28.plan.md`
- 状態詳細: `docs/handoff.md`
- Issue: https://github.com/cxl03157-afk/FitLog/issues/6
