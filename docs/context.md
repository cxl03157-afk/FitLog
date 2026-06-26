# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **13-2 着手**（例外処理・Toast・ErrorBoundary・既知バグ修正・E2E 拡充）
- Issue: #34（Phase 13-2）— PR 未作成
- Branch: `feature/issue-34-phase13-2-error-handling`
- Status: Commit 1（doc-sync）完了。Commit 2（Bug 1）以降未実施。

## テスト結果（Phase 13-1 完了時点 / merge commit 37c7bc0）

### Backend
- lint: PASS
- unit test: **150件 PASS**（16 suites）
- integration test: **38件 PASS**（4 suites）
- build: PASS

### Frontend
- lint: PASS
- unit test: **240件 PASS**（17 files）
- build: PASS
- E2E（phase10 + phase11 + phase13）: **12件 PASS**

## 技術スタック

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）+ LocalStack 3（S3 エミュレーション、Phase 9 追加）
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 13-1 確定決定事項

| 項目 | 決定 |
|------|------|
| recordType 変更制限 | PUT で既存値と異なる recordType → 400 BadRequestException（同じ値・省略は許可） |
| exerciseId 変更 | UpdatePersonalRecordDto に存在しない。フロント更新ペイロードには含めない |
| note 空欄時 | null を送信（削除）。bio 方式に統一 |
| 数値パース | `Number() + Number.isFinite()` 厳密検証（空欄/小数/負数/不正文字列 → API 呼ばない） |
| 削除中の表示 | 「はい」押下後に行内確認を閉じ、元の「削除」ボタンを disabled（差異1・承認済み） |
| unit test 配置 | `frontend/src/test/PersonalRecordsPage.test.tsx`（差異2・既存規則に合わせた） |
| POST レスポンス | exercise リレーション含まない（PersonalRecordCreated 型） |
| GET / PUT レスポンス | exercise リレーション含む（PersonalRecord 型） |
| Swagger description | 「登録直後のレスポンスにはexerciseリレーションを含まない」を追記（Commit 6で修正） |
| sourceExerciseSetId | 初期 UI 対象外（将来対応・別 Issue 候補） |


## NextAction

Commit 2（Bug 1 fix）→ Bug 2 調査ゲート → ユーザー承認後に Commit 3（Bug 2 fix）
→ Commit 4（AllExceptionsFilter）→ Commit 5（Toast）→ Commit 6（PersonalRecordsPage 移行）
→ Commit 7（ErrorBoundary）→ Commit 8（E2E）→ Commit 9（docs）→ PR 作成。

## Phase 13-2 既知バグ

| # | バグ | 原因 | Phase 13-2 対応 |
|---|------|------|----------------|
| 1 | 投稿詳細のナイス初期状態（0表示・未ナイス）| post 取得前に useLikeToggle が false/0 で初期化 | 失敗 unit test 追加 → LikeSection 分離 → Scenario 3 で確認 |
| 2 | タイムラインのコメント数が古い | 根本原因調査中（調査ゲート付き）| 調査結果報告 → ユーザー承認 → Commit 3 → Scenario 4 で確認 |

## Phase 13-1 確定決定事項

| 項目 | 決定 |
|------|------|
| recordType 変更制限 | PUT で既存値と異なる recordType → 400 BadRequestException（同じ値・省略は許可） |
| exerciseId 変更 | UpdatePersonalRecordDto に存在しない。フロント更新ペイロードには含めない |
| note 空欄時 | null を送信（削除）。bio 方式に統一 |
| 数値パース | `Number() + Number.isFinite()` 厳密検証（空欄/小数/負数/不正文字列 → API 呼ばない） |
| 削除中の表示 | 「はい」押下後に行内確認を閉じ、元の「削除」ボタンを disabled（差異1・承認済み） |
| unit test 配置 | `frontend/src/test/PersonalRecordsPage.test.tsx`（差異2・既存規則に合わせた） |
| POST レスポンス | exercise リレーション含まない（PersonalRecordCreated 型） |
| GET / PUT レスポンス | exercise リレーション含む（PersonalRecord 型） |
| Swagger description | 「登録直後のレスポンスにはexerciseリレーションを含まない」を追記（Commit 6で修正） |
| sourceExerciseSetId | 初期 UI 対象外（将来対応・別 Issue 候補） |

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 全体フェーズ計画（Phase 1〜18）: `docs/phase-roadmap.md`
- 認証仕様: `docs/features/01_auth.md`
- DB 設計: `docs/database.md`
- Swagger 仕様: `http://localhost:3000/api/docs`（バックエンド起動時）
- 状態詳細: `docs/handoff.md`
- Issue: #34（Phase 13-2）、#32（Phase 13-1 / 完了・PR #33 マージ済み）、#30（Phase 12 / 完了）
