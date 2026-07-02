# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **Phase 13-4.1**（実装完了 / PR 作成前）
- Issue: #49（Phase 13-4.1）— OPEN
- Branch: `feature/issue-49-phase13-4-1-localstack-persistence`
- HEAD: `f1908d5`

## 直前の完了 Phase

- **Phase 13-4**: 投稿者プロフィール導線・アバター表示（Issue #47 CLOSED / PR #48 MERGED）

## テスト結果（Phase 13-4.1 実装完了時点）

### Backend
- 変更なし（前フェーズから維持）
- lint: PASS / unit test: 198件 PASS / integration test: 42件 PASS / build: PASS

### Frontend
- 変更なし（前フェーズから維持）
- lint: PASS / unit test: 333件 PASS / build: PASS

### 検証
- `docker compose config`: PASS
- LocalStack 起動: PASS
- E2E（phase10 シナリオ1・3 画像系）: **2件 PASS**

## 技術スタック

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）+ LocalStack 3（S3 エミュレーション、Phase 9 追加）
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 13-4.1 確定決定事項

| 項目 | 決定 |
|------|------|
| S3 永続化（PERSISTENCE=1 + named volume） | **不採用**。Community v3.8.1 では `/var/lib/localstack/state/` へのスナップショット保存が動作しないことを確認 |
| `/tmp/localstack-s3-storage` 直接マウント | **不採用**。内部実装パスのため保守性リスク |
| `docker-compose.yml` 変更 | **なし**（永続化設定を追加しない） |
| 初期化スクリプト冪等化 | `head-bucket` で存在確認 → 未作成時のみ作成。`set -e` 維持・`|| true` 不使用 |
| README 追記 | LocalStack 起動前提・Community 版 S3 制約・`down` vs `down -v` の違い |
| 真の S3 永続化 | 別 Issue 候補（MinIO 移行・LocalStack Pro 等） |
| DB / Migration / Backend / Frontend | 変更なし |

## Phase 13-4 確定決定事項

| 項目 | 決定 |
|------|------|
| avatarUrl 追加先 | `WorkoutPostsService.attachImageUrls()` で動的生成。DB 変更なし |
| PostCard 構造 | ユーザーエリア（`/users/:id`）と投稿内容（`/workout-posts/:id`）を別 Link に分離 |
| アバター表示 | `avatarUrl` あり → `<img>`、なし → イニシャル円（`bg-blue-500 rounded-full`） |
| WorkoutPostDetailPage | 投稿者情報エリアを `<Link to="/users/:id">` にしアバター表示追加 |
| E2E シナリオ6・7 | タイムライン/詳細からプロフィール遷移を追加 |
| 共通 Avatar コンポーネント化 | 今回は見送り（Phase 13-5 or 以降） |
| DB / Migration | 変更なし |

## NextAction

push → PR 作成（`Closes #49`）→ CI 確認 → マージ → Phase 13-5 へ。

## 後続Phase一覧（正式構成）

| Phase | 内容 |
|-------|------|
| Phase 13-3A | 標準種目マスタ・テストデータ基盤整備（Issue #39 CLOSED / PR #40 MERGED）|
| Phase 13-3B | ユーザー独自種目 Backend（Issue #41 CLOSED / PR #42 MERGED）|
| Phase 13-3C1 | ユーザー独自種目 Frontend（ExerciseSelect / Issue #43 CLOSED / PR #44 MERGED）|
| Phase 13-3C2 | ユーザー独自種目 Frontend（管理画面 /exercises / Issue #45 CLOSED / PR #46 MERGED）|
| Phase 13-4 | ユーザー検索・プロフィール・フォロー導線改善（Issue #47 CLOSED / PR #48 MERGED）|
| Phase 13-4.1 | LocalStack初期化スクリプトの冪等化とCommunity版S3制約の文書化（Issue #49 OPEN / PR 作成前）|
| Phase 13-5 | プロフィール編集・アバター操作改善 |
| Phase 13-6 | 画像表示の信頼性・フォールバック改善 |
| Phase 13-7 | E2Eテストデータcleanupと再実行安定化 |
| Phase 13-7.1 | PostCardのナイス状態アクセシブル化（aria-pressed追加）|
| Phase 13-8 | 全ページのレスポンシブ対応（旧Phase 13-3より移設）|

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 全体フェーズ計画（Phase 1〜18）: `docs/phase-roadmap.md`
- 認証仕様: `docs/features/01_auth.md`
- DB 設計: `docs/database.md`
- Swagger 仕様: `http://localhost:3000/api/docs`（バックエンド起動時）
- 状態詳細: `docs/handoff.md`
- Issue: #49（Phase 13-4.1 / OPEN）、#47（Phase 13-4 / CLOSED）
- PR: #48（Phase 13-4 / MERGED）
