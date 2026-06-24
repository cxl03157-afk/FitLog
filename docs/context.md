# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **12 実装・検証完了**（API仕様書・Swagger整備）
- Issue: #30（Phase 12）— PR #31 オープン（CI グリーン・マージ承認待ち）
- Branch: `feature/issue-30-phase12-swagger`
- Status: lint / unit test（147件）/ integration test（21件）/ build / CI PASS。Swagger UI・OpenAPI JSON・/code-review 確認済み。PR #31 マージ承認待ち。

## 技術スタック

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）+ LocalStack 3（S3 エミュレーション、Phase 9 追加）
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 11 確定決定事項（11-1 完了時点）

| 項目 | 決定 |
|------|------|
| 週間・月間集計 | バックエンドが 12 期間固定配列を生成して返す（0補完あり・昇順） |
| 週間 period | 月曜始まり（`DATE_TRUNC('week', ...)` ISO 標準）。`YYYY-MM-DD` 形式 |
| 月間 period | `YYYY-MM` 形式 |
| totalVolume | `SUM(weight_kg × reps)`。自重（weight_kg=0）はボリューム不参加 |
| 種目別 metric | `weight`（weight_kg>0）→ `reps`（reps>=1）→ `none` の優先順 |
| 混在時ルール | 加重記録（weight_kg>0）が 1 件でもあれば `metric: 'weight'` 優先。自重のみの日は records から除外 |
| `limit` の意味 | 直近トレーニング日数（1〜90、デフォルト 30）。セット数・投稿数ではない |
| 目標期限バリデーション | JST 基準（`Date.now() + 9h` オフセット）で本日以降。`new Date('YYYY-MM-DD')` UTC 解釈を回避 |
| 相関バリデーション | `targetWeightKg` と `targetReps` の両方 null → 400 BadRequestException |
| CreateGoalDto 制約 | `targetWeightKg`: `@Min(0.01) @Max(1000)` / `targetReps`: `@Min(1) @Max(10000)` |
| date.util.ts | `getJstToday()` を `common/utils/date.util.ts` に切り出し（テストで jest.mock 可能） |
| 既知ドキュメント差異 | `docs/database.md` に Phase 5-1 追加済みの `personal_records` テーブルが未記載。Phase 11 スコープ外のため修正しない。Phase 12 開始時の doc-sync ゲートで Entity・Migration と照合して追記する |

## Phase 12 確定決定事項

| 項目 | 決定 |
|------|------|
| Swagger 整備対象 | 全12コントローラー・全16 DTO |
| @ApiBearerAuth 付与単位 | AuthController のみメソッド単位（register/login/refresh は認証不要）、他11コントローラーはクラス単位 |
| ファイルアップロード Swagger | `PATCH /users/me/avatar` と `POST /workout-posts/:id/images` に `@ApiConsumes('multipart/form-data')` + `@ApiBody` を追加 |
| docs/database.md | personal_records テーブルを Phase 12 で追記（Phase 11 doc-sync 持ち越し） |
| docs/features/02_workout_post.md | API パス・userId 型の誤記を A分類（ドキュメントのみ）修正 |
| /code-review 指摘5件 | logout 201/revokeSession 404/likes 409/PR update 400/revokeAllOtherSessions number schema を追加修正済み |
| スコープ外差異 | docs/tech-stack.md の Jest 29.x→30.x・Recharts 未記載は Phase 13 doc-sync ゲートで対処 |

## Phase 10 確定決定事項

| 項目 | 決定 |
|------|------|
| follows service N+1 回避 | getFollowers/getFollowing を QueryBuilder + LEFT JOIN に変更し isFollowing を一括取得 |
| 現在端末ログアウト | logout API（POST /api/auth/logout）のみ使用。finally で AuthContext クリア → /login |
| logout 失敗時 | エラートースト表示、finally で強制 AuthContext クリア。HttpOnly Cookie は残る可能性あり |
| E2E username 形式 | `e2e${workerIndex.toString(36)}${Date.now().toString(36)}.slice(0,20)`（英数字のみ、20文字以内） |
| Search DTO | @IsString @Transform(trim) @Matches(/\S/) @MaxLength(20)。limit: @Type(Number) @IsInt @Min(1) @Max(50) default=20 |
| bio 空文字処理 | 空文字 or trim後空文字 → null として保存 |
| 画像 API 失敗後 | 投稿は維持してタイムラインへ。トースト「投稿は保存されましたが画像のアップロードに失敗しました」 |
| Object URL 管理 | SelectedImage = { file, previewUrl }。削除は個別 revoke、アンマウントは ref 経由で全解放 |

## Phase 9 確定決定事項

| 項目 | 決定 |
|------|------|
| S3 モジュール | @Global() 不使用。WorkoutPostsModule / UsersModule で明示的にインポート |
| Multer storage | memoryStorage（S3 中継のため） |
| ファイル検証 | fileFilter（mimetype）+ limits.fileSize（10MB）。MIME は image/jpeg・png・webp のみ許可 |
| S3 key 形式 | `images/posts/{postId}/{uuid}.{ext}` / `images/avatars/{userId}/{uuid}.{ext}` |
| 表示 URL | `IMAGE_BASE_URL + "/" + imageKey`（DB に URL は保存しない） |
| 本番切り替え | AWS_S3_ENDPOINT を省略するだけで実 AWS S3 に接続する設計 |
| アップロードエラー時 | アップロード済みキーを deleteMany でロールバック。rollback 失敗はログのみ、元例外を再 throw |
| remove() のエラー | S3 削除失敗はログのみ、DB 削除は継続 |
| TypeORM select | FindOptionsSelect は配列不可（TS2559）→ オブジェクト形式 `{ field: true }` が必須 |

## NextAction

PR #31 CI グリーン確認済み。ユーザー承認後に PR #31 をマージ。
マージ後: main へ切り替えて pull → Issue #30 自動クローズ確認 → Phase 13 開始。
Phase 13 開始時の doc-sync ゲートで `docs/tech-stack.md`（Jest 30.x・Recharts 追記）を対処する。

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 全体フェーズ計画（Phase 1〜18）: `docs/phase-roadmap.md`
- 認証仕様: `docs/features/01_auth.md`
- DB 設計: `docs/database.md`
- Swagger 仕様: `http://localhost:3000/api/docs`（バックエンド起動時）
- 状態詳細: `docs/handoff.md`
- Issue: #30（Phase 12）、#28（Phase 11 / 完了）、#26（Phase 10 / 完了）、#24（Phase 9 / 完了）
