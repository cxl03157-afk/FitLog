# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **13-1 実装・ローカル検証・ドキュメント更新完了**（PersonalRecords CRUD UI）
- Issue: #32（Phase 13-1）— PR 未作成（PR 番号は作成後に追記）
- Branch: `feature/issue-32-phase13-1-personal-records`
- Status: Commit 1〜6 完了。PR 未作成・CI 未確認・main 未マージ。

## テスト結果（Phase 13-1 Commit 5 完了時点）

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

## Phase 12 確定決定事項

| 項目 | 決定 |
|------|------|
| Swagger 整備対象 | 全12コントローラー・全16 DTO |
| @ApiBearerAuth 付与単位 | AuthController のみメソッド単位（register/login/refresh は認証不要）、他11コントローラーはクラス単位 |
| ファイルアップロード Swagger | `PATCH /users/me/avatar` と `POST /workout-posts/:id/images` に `@ApiConsumes('multipart/form-data')` + `@ApiBody` を追加 |
| docs/database.md | personal_records テーブルを Phase 12 で追記（Phase 11 doc-sync 持ち越し） |
| docs/features/02_workout_post.md | API パス・userId 型の誤記を A分類（ドキュメントのみ）修正 |
| /code-review 指摘5件 | logout 201/revokeSession 404/likes 409/PR update 400/revokeAllOtherSessions number schema を追加修正済み |
| スコープ外差異 | docs/tech-stack.md の Jest 29.x→30.x・Recharts 未記載は Phase 13-2 doc-sync ゲートで対処 |

## NextAction

PR 作成（Issue #32 対応）→ CI グリーン確認 → レビュー → main マージ。
マージ後: main へ切り替え pull → Phase 13-2 開始。
Phase 13-2 開始前に既知バグ2件（ナイス初期状態・コメント数同期）を Phase 13-2 計画へ組み込む。

## Phase 13-2 への既知バグ（Phase 13-1 スコープ外）

| # | バグ | 原因 | Phase 13-2 対応 |
|---|------|------|----------------|
| 1 | 投稿詳細のナイス初期状態（0表示・-1）| post 取得前に useLikeToggle が false/0 で初期化 | 失敗 unit test 追加 → 修正 → Scenario 4 で確認 |
| 2 | タイムラインのコメント数が古い | posts state が初回取得値を保持。詳細でのコメント追加が反映されない | 失敗テスト追加 → 修正 → Scenario 5 に「コメント後タイムライン件数」確認を追加 |

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 全体フェーズ計画（Phase 1〜18）: `docs/phase-roadmap.md`
- 認証仕様: `docs/features/01_auth.md`
- DB 設計: `docs/database.md`
- Swagger 仕様: `http://localhost:3000/api/docs`（バックエンド起動時）
- 状態詳細: `docs/handoff.md`
- Issue: #32（Phase 13-1）、#30（Phase 12 / 完了・PR #31 マージ済み）、#28（Phase 11 / 完了）
