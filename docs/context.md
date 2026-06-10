# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **4 PR作成済み**（認証API実装・Codex承認済み）
- Issue: **#8**
- Branch: `feature/issue-8-phase4-auth`
- Status: 実装完了・Codex レビュー全指摘解消・PR 作成済み・CI 待ち

## 技術スタック

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）※ LocalStack は Phase 9
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 4 確定決定事項

| 項目 | 決定 |
|------|------|
| Cookie | HttpOnly, SameSite=Strict, Path=/api/auth |
| Cookie Secure | 本番: true、ローカル: false（NODE_ENV で切り替え） |
| DELETE /api/auth/sessions | 現在端末を除く全セッションを無効化 |
| レート制限 | login: 10回/分、refresh: 20回/分（IP + email 識別） |
| トークン削除保持期間 | revoked_at / expires_at から 30 日後 |
| 監査ログ | NestJS Logger JSON 形式（専用テーブル不要） |
| 機微情報マスキング | token/cookie/password をログでマスク |
| CORS | フロントエンドのオリジンのみ許可 |

## NextAction

CI グリーンを確認後、PR を main にマージする。マージ後は Phase 5 の計画を開始する。

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 認証仕様: `docs/features/01_auth.md`
- DB 設計: `docs/database.md`
- 状態詳細: `docs/handoff.md`
- Issue: https://github.com/cxl03157-afk/FitLog/issues/8
