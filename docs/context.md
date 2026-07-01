# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **Phase 13-4**（実装完了 / PR 作成済み・CI 確認待ち）
- Issue: #47（Phase 13-4）— OPEN
- Branch: `feature/issue-47-phase13-4-profile-navigation`
- PR: #48（作成済み・CI 確認中）
- HEAD: `bd44c7d`（E2E commit）+ docs commit

## 直前の完了 Phase

- **Phase 13-3C2**: 独自種目管理画面（Issue #45 CLOSED / PR #46 MERGED）

## テスト結果（Phase 13-4 実装完了時点）

### Backend
- lint: PASS
- unit test: **198件 PASS**（17 suites）
- integration test: **42件 PASS**（4 suites）
- build: PASS

### Frontend
- lint: PASS
- unit test: **333件 PASS**（22 files）
- build: PASS
- E2E（phase10 × 6 + phase11 × 4 + phase13 × 7）: **17件 PASS**（LocalStack 起動必須）

## 技術スタック

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）+ LocalStack 3（S3 エミュレーション、Phase 9 追加）
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

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

## Phase 13-2 確定決定事項

| 項目 | 決定 |
|------|------|
| weightKg 最小値（個人記録） | 0.01kg（0 を拒否。create / update 両方） |
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

CI グリーン確認 → マージ → Issue #47 自動クローズ確認 → Phase 13-4.1 へ。

## 後続Phase一覧（正式構成）

| Phase | 内容 |
|-------|------|
| Phase 13-3A | 標準種目マスタ・テストデータ基盤整備（Issue #39 CLOSED / PR #40 MERGED）|
| Phase 13-3B | ユーザー独自種目 Backend（Issue #41 CLOSED / PR #42 MERGED）|
| Phase 13-3C1 | ユーザー独自種目 Frontend（ExerciseSelect / Issue #43 CLOSED / PR #44 MERGED）|
| Phase 13-3C2 | ユーザー独自種目 Frontend（管理画面 /exercises / Issue #45 CLOSED / PR #46 MERGED）|
| Phase 13-4 | ユーザー検索・プロフィール・フォロー導線改善（Issue #47 OPEN / PR #48 CI 確認中）|
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
- Issue: #47（Phase 13-4 / OPEN）、#45（Phase 13-3C2 / CLOSED）、#43（Phase 13-3C1 / CLOSED）
- PR: #48（Phase 13-4 / CI 確認中）、#46（Phase 13-3C2 / MERGED）、#44（Phase 13-3C1 / MERGED）
