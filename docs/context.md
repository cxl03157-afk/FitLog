# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **Phase 13-2 完了 / Phase 13-2.1 着手前**
- Issue: #34（Phase 13-2）— CLOSED（PR #35 マージ後に自動クローズ）
- PR: #35 / MERGED / merge commit: `4d55f09`（2026-06-27）
- main HEAD: `4d55f09`

## テスト結果（Phase 13-2 完了時点 / HEAD `4d55f09`）

### Backend
- lint: PASS
- unit test: **172件 PASS**（17 suites）
- integration test: **42件 PASS**（4 suites）
- build: PASS

### Frontend
- lint: PASS
- unit test: **289件 PASS**（20 files）
- build: PASS
- E2E（phase10 × 6 + phase11 × 4 + phase13 × 4）: **14件 PASS**（3回連続）

## 技術スタック

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）+ LocalStack 3（S3 エミュレーション、Phase 9 追加）
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 13-2 確定決定事項

| 項目 | 決定 |
|------|------|
| weightKg 最小値 | 0.01kg（0 を拒否。create / update 両方） |
| 既存 0kg レコード | 変更なし（読み取り・表示は可能。DB CHECK 制約未追加）|
| 種目選択（新規） | 未選択（「種目を選択してください」）。明示選択が必須 |
| 種目選択（編集） | 既存種目を表示・変更不可 |
| NavBar 投稿リンク | `新規投稿`（`/workout-posts/new`）。投稿フォームの送信ボタンは `投稿する` のまま |
| AllExceptionsFilter | APP_FILTER で AppModule に登録。HttpException は透過、非 HttpException は 500 |
| Provider 順序 | BrowserRouter > ErrorBoundary > AuthProvider > ToastProvider > Routes |
| ErrorBoundary | BrowserRouter 直下。FallbackUI は useNavigate を使ってリセット＋/ 遷移 |

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

Phase 13-2.1 Issue 作成（未採番）→ 実装計画確認 → ブランチ作成 → 実装開始。

## 後続Phase一覧（正式構成）

| Phase | 内容 |
|-------|------|
| Phase 13-2.1 | NavBarに検索・統計・目標管理への導線追加（Issue 未作成・未採番）|
| Phase 13-3 | 種目マスタ整理・ユーザー独自種目機能（標準種目一覧・部位カテゴリ・独自種目・テスト cleanup）|
| Phase 13-4 | ユーザー検索・プロフィール・フォロー導線改善 |
| Phase 13-4.1 | LocalStack S3データ永続化 |
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
- Issue: #34（Phase 13-2 / CLOSED・PR #35 マージ済み）、#32（Phase 13-1 / 完了・PR #33 マージ済み）、#30（Phase 12 / 完了）
- PR: #35（Phase 13-2 / MERGED 2026-06-27・merge commit: `4d55f09`）、#33（Phase 13-1 / マージ済み）
