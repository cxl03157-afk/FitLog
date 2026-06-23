# Agent Handoff

## CurrentPhase
- Phase 9 complete: S3 画像アップロード バックエンド + LocalStack（Issue #24）PR #25 CI グリーン・レビュー待ち（2026-06-19）
- Phase 8 complete: フロントエンド コメント・ナイス機能（Issue #22）PR #23 マージ済み（2026-06-18）
- Phase 7-1 complete: workout-posts passwordHash 漏洩修正（Issue #20）PR #21 マージ済み（2026-06-17）
- Phase 7 complete: フロントエンド タイムライン・投稿機能（Issue #18）PR #19 マージ済み（2026-06-17）
- Phase 6 complete: フロントエンド基盤（Issue #16）PR #17 マージ済み（2026-06-17）
- Phase 5-1 complete: パーソナルレコード手動登録 API（Issue #14）PR #15 マージ済み（2026-06-12）
- Phase 5 complete: バックエンド API（Issue #12）PR #13 マージ済み（2026-06-11）
- Phase 4 complete: 認証API実装（Issue #8）PR #9 merged（2026-06-10）
- Phase 3 complete: PR #7 merged, Issue #6 closed
- Phase 2 complete: PR #4 merged, Issue #3 closed

## Status
- Issue #24 完了・PR #25 CI グリーン・レビュー待ち（2026-06-19）
- Issue #22 完了・PR #23 マージ済み（2026-06-18）
- Issue #20 完了・PR #21 マージ済み（2026-06-17）
- Issue #18 完了・PR #19 マージ済み（2026-06-17）
- Issue #16 完了・PR #17 マージ済み（2026-06-17）
- Issue #14 完了・PR #15 マージ済み（2026-06-12）
- Issue #12 完了・PR #13 マージ済み（2026-06-11）
- Issue #8 完了・PR #9 マージ済み（2026-06-10）
- Issue #10 完了・PR #11 マージ済み（2026-06-10）

## SourceOfTruthOrder
1. `CLAUDE.md` (workflow and guardrails)
2. `docs/要件定義書.md` (product scope and non-functional requirements)
3. `docs/features.md` + `docs/features/*.md` (use cases and API contracts)
4. `docs/screens.md` (UI and navigation behavior)
5. `docs/database.md` (ER and data constraints)
6. This file `docs/handoff.md` (execution state and next action)

## ResponsibilitySplit
- Issue: objective, definition of done, deliverables
- PR: implementation delta, validation evidence, `Closes #...`
- `docs/handoff.md`: current state, decisions, open questions, next action

## Decisions
- Multi-device auth is adopted (session-scoped refresh token lifecycle).
- Session management API (`/api/auth/sessions`) is in scope.
- Replay detection via `replaced_by_token_id` is required.
- Security controls include Origin/Referer check, rate limit, audit logging.
- Phase 2 mock is plain static files under `mock/` (HTML/CSS/JS + Tailwind CDN).
- Follow list UI is one screen with tab switch; routes remain two (`/followers`, `/following`).
- Phase 2 mock fidelity is fixed to desktop-first (mobile optimization is deferred).
- Handoff operation must verify that the prompt Issue number and `docs/handoff.md` References Issue are identical before execution.
- Mock state is persisted in `sessionStorage` (`fitlog_mock_v4`); reset via `login.html?reset=1`.
- Follow state uses `followingIds` array (not a map); unfollow shows a confirmation dialog.
- Timeline shows a compact follow button on others' posts only (no separate "フォロー中" label beside the name).
- Goal abandon action label is 「中止する」; delete and abort both require confirmation dialogs.
- Mock auth stores registered users in `registeredUsers` / `accounts`; register requires password confirmation.
- [Phase 3] `docker-compose.yml` は PostgreSQL 17 のみ。LocalStack は Phase 9 で追加する。
- [Phase 3] CI 完了条件は Lint + 型チェック + テスト（Jest/Vitest）まで含む。
- [Phase 3] Node 22 は CI で強制する（`actions/setup-node@v4` + `.nvmrc`）。
- [Phase 3] Tailwind CSS は v3（`tailwind.config.js` + `postcss.config.js`）で導入する。
- [Phase 4] Cookie: HttpOnly, SameSite=Strict, Path=/api/auth; Secure は NODE_ENV で切り替え。
- [Phase 4] DELETE /api/auth/sessions は現在端末を除く全セッションを無効化。
- [Phase 4] レート制限: login 10回/分、refresh 20回/分（IP + email）。
- [Phase 4] トークン削除保持期間: revoked_at / expires_at から 30 日後。
- [Phase 4] 監査ログ: NestJS Logger JSON 形式。機微情報マスキング必須。
- [Phase 5] exercises.controller: GET /api/exercises は認証必須（仕様書 UC-xx に基づき @UseGuards(JwtAuthGuard) 適用）。
- [Phase 5] DECIMAL 列（weight_kg 等）は pg ドライバーが string を返す → TypeORM transformer で parseFloat。
- [Phase 5] repository.update() は @UpdateDateColumn を発火しない → updatedAt: new Date() を明示。
- [Phase 5-1] personal_records テーブルを新設（exercise_sets の is_pr フラグとは独立した CRUD）。source_exercise_set_id は nullable FK で元セットとの紐付けは任意。
- [Phase 6] User 型は `{ id, username, displayName, email }` の4フィールド。avatarUrl / bio は login/refresh レスポンス非含有のため Phase 10 で追加。
- [Phase 6] Axios interceptor: `/api/auth/refresh` 自体への 401 はリトライしない（originalRequest.url チェックで除外）。_retry フラグで同一リクエストの二重リトライも防止。
- [Phase 6] フロントエンド CI に Build ステップ追加（tsc -b + vite build）。
- [Phase 6] .env.local が必須（VITE_API_BASE_URL）。新規クローン時は `cp .env.example .env.local`。README に手順追記済み。
- [Phase 7] trainedOn はローカル日付で初期化（toISOString().slice(0,10) は UTC 基準のため不可）。
- [Phase 7] フォロー中タブは UI のみ表示。API 呼び出しは Phase 10 まで行わない。
- [Phase 7] 削除確認は window.confirm 禁止。showDeleteConfirm state でインライン表示。
- [Phase 7] workout-posts の user リレーションが passwordHash を含む → Phase 7-1 で修正済み。
- [Phase 7] dataSource.transaction(manager) 内で this.xxxRepository を呼ぶと別コネクションが使われ未コミットデータが見えない。createdId をコールバック外に持ち出してコミット後に findOne() を呼ぶ。
- [Phase 7-1] User.passwordHash に @Exclude() + WorkoutPostsController に @UseInterceptors(ClassSerializerInterceptor) を適用。グローバル適用は他エンドポイントへの影響リスクのため回避。
- [Phase 7-1] @Exclude() は class インスタンス（Object.assign(new User(), {...})）でのみ機能。plain object では除外されない。
- [Phase 7-1] Controller + supertest テストを追加（74件 pass）。ClassSerializerInterceptor は HTTP パイプライン経由でのみ動作するため、Controller メソッド直接呼び出しでは検証不可。
- [Phase 8] likeCount / commentCount / isLiked を GET /api/workout-posts・GET /api/workout-posts/:id レスポンスに追加（サブクエリ方式）。
- [Phase 8] CommentsController に @UseInterceptors(ClassSerializerInterceptor) を適用。createComment も user リレーション込みで返す。
- [Phase 8] createComment: save 後に findOneOrFail({ relations: { user: true } }) で再取得（user 未ロード → c.user.displayName TypeError を防止）。
- [Phase 8] コメント文字数上限 280 文字（@MaxLength(280)）。フロント・バック統一。
- [Phase 8] ナイストグル 409 Conflict: isLiked=true に寄せ likeCount は prevCount に戻す（楽観的更新の二重加算防止）。
- [Phase 8] PostCard を <article> 構造に変更。ナイスボタンは <Link> 外に配置（リンク内ボタンの UX 問題回避）。
- [Phase 8] Playwright クラス判定で includes('orange') 禁止。hover:text-orange-400 も一致するため includes('text-orange-500') または data-testid を使う。
- [Phase 8] 統合テスト型アサーション: TypeScript が直接 as T を拒否する場合は as unknown as T の二段アサーションに変更。
- [Phase 9] S3 モジュールは @Global() 不使用。WorkoutPostsModule / UsersModule で明示的にインポート（依存関係の可視化）。
- [Phase 9] Multer は memoryStorage。fileFilter で image/jpeg・png・webp のみ許可、limits.fileSize 10MB。
- [Phase 9] S3 key: `images/posts/{postId}/{uuid}.{ext}` / `images/avatars/{userId}/{uuid}.{ext}`。URL は IMAGE_BASE_URL + key で生成（DB に URL を保存しない）。
- [Phase 9] AWS_S3_ENDPOINT が未設定なら実 AWS S3 へ接続。LocalStack は endpoint + forcePathStyle=true で切り替え。
- [Phase 9] uploadImages エラー: アップロード済みキーを deleteMany でロールバック。rollback 失敗はログのみ、元例外を再 throw。remove() の S3 削除失敗もログのみ、DB 削除は継続。
- [Phase 9] TypeORM FindOptionsSelect は配列形式不可（TS2559）→ `{ field: true }` のオブジェクト形式が必須。
- [Phase 9] 統合テストのユーザー名は DB の 20文字上限に注意（`av_${Date.now()}` = 16文字で適合）。
- [Phase 10 / 10-1] `GET /api/users/:id`（プロフィール取得）・`GET /api/users/search`（ユーザー検索）・`PATCH /api/users/me/profile`（プロフィール更新）の 3 エンドポイントを UsersController / UsersService に追加。
- [Phase 10 / 10-1] GET /api/users/:id: postCount / followerCount / followingCount を EXISTS サブクエリで一括取得。avatarUrl は `IMAGE_BASE_URL + "/" + avatarKey`（null なら null）。自分自身は isFollowing=false。存在しないユーザーは 404。
- [Phase 10 / 10-1] GET /api/users/search バリデーション: `@IsString @Transform(trim) @Matches(/\S/) @MaxLength(20)` / limit: `@Type(Number) @IsInt @Min(1) @Max(50) default=20`。trim 後の ILIKE 検索。2文字未満制限はフロントエンドのみ。
- [Phase 10 / 10-1] PATCH /api/users/me/profile: `displayName` は trim 後 MinLength(1)（空白のみ→400）。`bio` は空文字・trim後空文字→null 変換。空 DTO は no-op。未知フィールドは 400（forbidNonWhitelisted）。
- [Phase 10 / 10-1] getFollowers / getFollowing: 旧 `Follow[]` 返却から `FollowUserDto[]` に変更。QueryBuilder + EXISTS サブクエリで isFollowing を一括取得（N+1 回避）。avatarUrl を含む。存在しないユーザーは 404（usersService.findById が throw）。存在するユーザーでフォロワーなしは 200 + 空配列。
- [Phase 10 / 10-1] テスト結果: lint PASS / unit 114 PASS / build PASS / integration 21 PASS（2026-06-23）。
- [Phase 10 / 10-2] `types/auth.ts`: `AuthUser`（auth API が返す基本4フィールド）を分離し、`User = AuthUser & { avatarUrl: string|null, bio: string|null }` に拡張。`AuthResponse.user` は `AuthUser` 型。
- [Phase 10 / 10-2] `types/workout.ts`: `PostImageItem = { id, imageKey, displayOrder, imageUrl }` 追加。`WorkoutPost.postImages: PostImageItem[]` 追加。
- [Phase 10 / 10-2] `types/user.ts`（新規）: `UserProfile`・`SearchUser`・`FollowUser` 型定義。
- [Phase 10 / 10-2] `api/workoutPosts.ts`: `FetchWorkoutPostsParams` に `feed?: 'all' | 'following'`・`userId?: string` 追加。
- [Phase 10 / 10-2] `api/users.ts`（新規）: `getProfile`・`searchUsers`・`updateProfile`・`uploadAvatar`。
- [Phase 10 / 10-2] `api/follows.ts`（新規）: `followUser`・`unfollowUser`・`getFollowers`・`getFollowing`。
- [Phase 10 / 10-2] `api/sessions.ts`（新規）: `SessionInfo`・`getSessions`・`revokeSession`・`revokeAllOtherSessions`。
- [Phase 10 / 10-2] `AuthContext`: login/register 直後に `avatarUrl: null, bio: null` でセット後、非同期で `getProfile` を呼びプロフィール補完。`updateCurrentUser` を context に公開（外部コンポーネントから部分更新可能）。補完失敗: 401 のみ認証クリア、それ以外はコンソールエラーのみでログイン維持。`setUser` 関数形式で更新するため stale closure の上書きは発生しない。
- [Phase 10 / 10-2] テスト結果: lint PASS / unit 28 PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-3] 投稿画像 UI 実装。画像は最大4枚・JPEG/PNG/WebP・各10MB以下。0バイト・重複ファイル（名前+サイズ+lastModified が同一）は選択時に除外。一部不正ファイルがあっても有効ファイルは保持して送信続行。Object URL は削除時に対象のみ個別 revoke、アンマウント時は `selectedImagesRef` 経由で全残存 URL を一括解放（stale closure 回避）。
- [Phase 10 / 10-3] 投稿後に POST /:id/images が失敗した場合も投稿 DB は維持。タイムラインへ遷移してトースト「投稿は保存されましたが、画像のアップロードに失敗しました」を表示（5秒後自動消去）。再試行 UI は Phase 10 スコープ外。
- [Phase 10 / 10-3] PostCard・WorkoutPostDetailPage に postImages グリッド表示追加（1枚: grid-cols-1、2-4枚: grid-cols-2）。TimelinePage は `useLocation().state.toast` でトーストを表示。
- [Phase 10 / 10-3] テスト結果: lint PASS / unit 44 PASS（+16件）/ tsc PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-4] ProfilePage（`pages/stubs/ProfilePage.tsx`）を完全実装。ローディング・404・エラー・正常の4状態対応。
- [Phase 10 / 10-4] アバター表示: `avatarUrl` あり → `<img>`、なし → 表示名イニシャル円（取得不可時は `?`）。
- [Phase 10 / 10-4] 自分のプロフィール: 「プロフィールを編集」ボタン → インラインモーダル（表示名・bio）+ アバター変更ボタン（モーダル内）。他ユーザー: フォロー/フォロー中ボタン。
- [Phase 10 / 10-4] フォロー操作: API 成功時のみ followerCount ±1。409（既フォロー）→ isFollowing=true に寄せるが件数は変化しない。404 on unfollow → isFollowing=false に寄せるが件数は変化しない。
- [Phase 10 / 10-4] アバター更新成功: `uploadAvatar` → `updateCurrentUser({ avatarUrl })` で NavBar 即時反映。失敗: モーダル内エラー表示・既存アバター維持。
- [Phase 10 / 10-4] `useEffect` の setState を同期的に effect 本体で呼ぶ代わりに cleanup 関数でリセット（`react-hooks/set-state-in-effect` lint エラー回避）。`cancelled` フラグで旧フェッチのレース防止。
- [Phase 10 / 10-4] アバター input.value は `handleAvatarSelect` 冒頭で同期的に `= ''` リセット（同一ファイルの再選択対応）。
- [Phase 10 / 10-4] テスト結果: lint PASS / unit 68 PASS（23 ProfilePage + 5 AuthContext + 40 other）/ tsc PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-4] Playwright スポット確認（13項目 PASS / 2026-06-23）: 自分のプロフィール表示（イニシャル・統計・編集ボタン）・表示名 bio 編集の画面反映・アバターアップロード後の &lt;img&gt; 切り替えと NavBar 即時反映・他ユーザープロフィール（フォローボタン）・フォロー→followerCount+1・フォロー解除→followerCount-1・フォロワー/フォロー中リンク先 URL・投稿一覧/0件表示。

## OpenQuestions
- (none)

## ReviewStatus
- Status: PR #25 CI グリーン・レビュー待ち（lint ✅ / test ✅ / build ✅ / CI ✅）

## MergeReadiness
- レビュー承認待ち（lint ✅ / test ✅ / build ✅ / CI ✅）

## NextAction
Sub-phase 10-4 コミット承認後 → Sub-phase 10-5（フォロー一覧・検索・フォロー中タイムライン）実装へ進む。

## References
- Plan（全体）: `docs/phase-roadmap.md`
- Issue: #26（Phase 10 / 進行中）、#24（Phase 9 / 完了）、#22（Phase 8 / 完了）、#20（Phase 7-1 / 完了）、#18（Phase 7 / 完了）、#16（Phase 6 / 完了）
- PR: #25（Phase 9 / マージ済み）、#23（マージ済み）、#21（マージ済み）、#19（マージ済み）
- Branch: `feature/issue-26-phase10-frontend`（Phase 10 実装中）
- Repository: `https://github.com/cxl03157-afk/FitLog`

## UpdateRules
- Update this file at phase start, after every major decision, and at phase end.
- Keep `NextAction` as one concrete executable step.
- Never leave `OpenQuestions` stale after a decision is made.
- Keep `ReviewStatus` and `MergeReadiness` updated from PR creation to merge.

## PilotFeedback
- Phase 2 多エージェント運用の知見（Issue #10 で運用廃止済み）:
  - Codex/Composer へのコンテキスト引き渡しコストが高く、Claude Code 単独で完結できることが判明
  - docs/handoff.md をコード PR に混在させると CI が余分に起動する（コードと別 PR で管理すること）
