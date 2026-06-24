# Agent Handoff

## CurrentPhase
- **Phase 11 進行中**: 週間/月間集計・目標設定（Issue #28 / Branch: `feature/issue-28-phase11-stats-goals`）
  - Sub-phase 11-1（バックエンド修正）完了・コミット済み。
  - Sub-phase 11-2（Recharts 導入 + フロントエンド型定義・API クライアント）未着手。
- **Phase 10 完了**: フロントエンド フォロー・プロフィール・画像UI（Issue #26 / PR #27 マージ済み 2026-06-24）
- Phase 9 complete: S3 画像アップロード バックエンド + LocalStack（Issue #24）PR #25 マージ済み（2026-06-19）
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
- Issue #28: オープン（Phase 11 進行中）
- Issue #26 完了・PR #27 マージ済み（2026-06-24）
- Issue #24 完了・PR #25 マージ済み（2026-06-19）
- Issue #22 完了・PR #23 マージ済み（2026-06-18）
- Issue #20 完了・PR #21 マージ済み（2026-06-17）
- Issue #18 完了・PR #19 マージ済み（2026-06-17）
- Issue #16 完了・PR #17 マージ済み（2026-06-17）
- Issue #14 完了・PR #15 マージ済み（2026-06-12）
- Issue #12 完了・PR #13 マージ済み（2026-06-11）
- Issue #8 完了・PR #9 マージ済み（2026-06-10）
- Issue #10 完了・PR #11 マージ済み（2026-06-10）

## Phase11CommitHistory（次セッション引き継ぎ用）

| Sub-phase | コミットハッシュ | 内容 |
|-----------|--------------|------|
| 11-1 | `b8475b7` | feat: implement sub-phase 11-1 stats and goal validation |
| 11-2 | `c31f650` | feat: add recharts and stats and goals API clients |
| 11-3 | TBD | feat: implement StatsPage with weekly/monthly/exercise charts |

## Phase10CommitHistory（次セッション引き継ぎ用）

| Sub-phase | コミットハッシュ | 内容 |
|-----------|--------------|------|
| 10-1 | `5e16ca3` | feat: implement Phase 10-1 backend user APIs |
| 10-2 | `2545afc` | feat: add frontend types and API clients for Phase 10 |
| 10-3 | `0418bbb` | feat: implement Phase 10-3 post image UI |
| 10-4 | `55422a5` | feat: implement Phase 10-4 profile and avatar UI |
| 10-5 | `690bd8c` | feat: implement Phase 10-5 follow and search UI |
| 10-6 | `cf6fb1f` | feat: implement Phase 10-6 session management UI |
| 10-7 | `f162009` | feat: implement Phase 10-7 NavBar avatar and Playwright E2E |
| docs | `5f19d8d` | docs: prepare Phase 10 for review |
| fix  | `dbce453` | test: fix QueryBuilder mock types in backend specs |

## UncommittedChanges

Sub-phase 11-1 コミット後は変更なし（クリーン状態）。次作業は Sub-phase 11-2。

- `.claude/settings.json` は今後もいかなるコミットにも含めない。
- 次セッション開始時は最初に `git status --short` を実行して作業ツリーを確認すること。

## TestResults（Sub-phase 11-3 完了時点）

| チェック | 結果 |
|---------|------|
| Backend lint | PASS（11-1 時点） |
| Backend unit test | PASS（16 suites / 147 tests、11-1 時点） |
| Backend integration test | PASS（3 suites / 21 tests、11-1 時点） |
| Backend build | PASS（11-1 時点） |
| Frontend lint | PASS |
| Frontend unit test | PASS（15 files / 159 tests）|
| Frontend build | PASS |

## TestResults（Sub-phase 10-6 完了時点）

| チェック | 結果 |
|---------|------|
| Frontend lint | PASS |
| tsc --noEmit | PASS |
| unit test | PASS（133 / 133）— SessionsPage 20・NavBar 3・LoginPage 6・AuthContext 6・other 98 |
| build | PASS |
| Playwright 10-6 スポット確認（7項目） | PASS（2026-06-24） |
| Backend unit/integration test | 前回（10-1）以降変更なし・PASS 維持 |

### Playwright 10-6 スポット確認項目（7 / 7 PASS）
1. 2つのセッションを別コンテキストで作成できた
2. SessionsPage に複数セッションが表示される
3. 「現在の端末」バッジが正確に1件表示される
4. 他端末を個別ログアウト → その行だけ消える
5. 個別ログアウト後、現在端末が残る
6. 「この端末を除く全端末をログアウト」で他端末のみ消える
7. 現在端末ログアウト → /login へ遷移する

### 未実施の Playwright 確認
- Sub-phase 10-7 の Playwright 自動 E2E テスト（6シナリオ）は未実施。
  計画ファイル（`/Users/user/.claude/plans/happy-beaming-cat.md`）の Sub-phase 10-7 参照。
  6シナリオ: 画像付き投稿・プロフィール更新・アバター更新・フォロー中タイムライン・ユーザー検索遷移・別セッション削除。

## ApprovalStatus

| 操作 | 状態 | 備考 |
|------|------|------|
| Sub-phase 10-1〜10-7 コミット | **承認済み・実施済み** | f162009・5f19d8d・dbce453 を含む全コミット完了 |
| push | **承認済み・実施済み** | origin/feature/issue-26-phase10-frontend へ push 済み |
| PR 作成 | **承認済み・実施済み** | PR #27 オープン中 |
| 完了ドキュメント追加 push | **コミット待ち** | コミット9（本ファイル含む3ファイル）承認後に push |
| マージ | **未承認・未実施** | CI 再確認・ユーザー最終承認後にマージ |

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
- [Phase 10 / 10-5] UserCard（`components/UserCard.tsx`）新規作成。アバター（avatarUrl あり → img / なし → イニシャル円、取得不可時は `?`）・表示名・`@username`・フォローボタン（自分自身には非表示）。カード全体が `/users/:id` リンク。フォローボタンはリンク外に配置（クリックでプロフィール遷移しない）。エラーメッセージは3秒後に自動消去（useEffect cleanup でタイマーをクリア）。フォロー API 成功まで isFollowing を変更しない（非楽観的更新）。409 → isFollowing=true に寄せる / 404 → isFollowing=false に寄せる / その他 → 元の状態を維持しエラーメッセージ表示。
- [Phase 10 / 10-5] FollowersPage / FollowingPage（スタブ→実装）。getFollowers / getFollowing を呼び UserCard で一覧表示。0件・404・その他 API エラーをそれぞれ表示。タブ切替は Link（`/users/:id/followers` ↔ `/users/:id/following`）。useEffect cleanup で cancelled フラグ + setState リセット（react-hooks/set-state-in-effect 対応）。
- [Phase 10 / 10-5] SearchPage（スタブ→実装）。入力 300ms デバウンス + AbortController（新しいリクエスト開始時に旧リクエストを abort）。trim 後 2文字以上の場合のみ `GET /api/users/search` を呼ぶ。2文字未満に戻した際はデバウンスタイマーをキャンセルし controller.abort() + 結果・エラー・ローディングをすべてクリア。キャンセルされたリクエストではエラー表示しない（cancelled フラグで判定）。自分自身の結果にフォローボタン非表示（UserCard の isSelf チェック）。`api/users.ts` の `searchUsers` に AbortSignal パラメータを追加。
- [Phase 10 / 10-5] TimelinePage フォロー中タブ有効化。useEffect の依存配列を `[activeTab]` に変更し `feed: activeTab` でフェッチ。タブ切替時に cleanup（cancelled=true + 各 state リセット）→ 旧リクエスト結果が新しいタブを上書きしない。handleLoadMore も `activeTab` を参照するため二重呼び出しなし。フォロー中 0件時は「フォロー中のユーザーの投稿はありません。」を表示。
- [Phase 10 / 10-5] テスト結果: lint PASS / unit 107 PASS（12 UserCard + 11 FollowersPage/FollowingPage + 10 SearchPage + 10 TimelinePage + 23 ProfilePage + 16 WorkoutPostNewPage + 25 other）/ tsc PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-5] Playwright スポット確認（11項目 PASS / 2026-06-23）: フォロワー0件表示・フォロー中0件表示・ユーザー検索（e2espot2 表示）・自分自身にフォローボタンなし・検索結果からプロフィール遷移・フォロー成功（ボタン「フォロー中」）・フォロワー一覧に e2espot1 表示・フォロー中一覧に e2espot2 表示・フォロー中タイムラインに投稿表示・フォロー解除成功・フォロー解除後タイムラインから消える。
- [Phase 10 / 10-6] SessionsPage（`pages/stubs/SessionsPage.tsx`）を完全実装。スピナー・取得失敗・0件・一覧の4状態対応。
- [Phase 10 / 10-6] `isCurrent=true` の行に「現在の端末」バッジ。各行にログアウトボタン。全他端末ログアウトボタン（他端末がある場合のみ表示）。
- [Phase 10 / 10-6] 現在端末ログアウト: `AuthContext.logout()` を呼ぶ → 成功/失敗を問わず `/login` へ遷移。失敗時は `navigate('/login', { state: { logoutError } })` でエラーを渡し LoginPage で表示。
- [Phase 10 / 10-6] 他端末ログアウト: `revokeSession` 成功 → 対象行をリストから削除。失敗 → トーストエラー表示（5秒後自動消去）。処理中は対象ボタンのみ disabled・二重実行防止。
- [Phase 10 / 10-6] 全他端末ログアウト: `revokeAllOtherSessions` 成功 → `getSessions` 再取得。再取得失敗時は `refetch-error` 警告メッセージ（永続表示）＋「再読み込み」ボタンで再試行。既存一覧は加工しない。
- [Phase 10 / 10-6] `AuthContext.logout()` を try/finally に変更: API 失敗時でも `setAccessToken(null)` / `setUser(null)` を必ず実行し、エラーを re-throw。
- [Phase 10 / 10-6] `NavBar.handleLogout` を try/catch に変更: logout 失敗時も `/login` へ遷移・未処理 Promise rejection を防止。失敗時は `logoutError` を navigate state で渡す。
- [Phase 10 / 10-6] `LoginPage` に `location.state.logoutError` 読み取りを追加: ログアウト失敗エラーを遷移後にオレンジ色のバナーで表示。
- [Phase 10 / 10-6] `docs/features/01_auth.md` に `GET /api/auth/sessions` レスポンスフィールド仕様・logout 失敗時のフロントエンド動作（auth 常にクリア・Cookie 残存可能性・再認証の可能性・エラー表示方式）を追記。
- [Phase 10 / 10-6] テスト結果: lint PASS / unit 133 PASS（20 SessionsPage + 3 NavBar + 6 LoginPage + 6 AuthContext + 98 other）/ tsc PASS / build PASS（2026-06-23）。

- [Phase 11 / 11-1] 週間・月間集計はバックエンドが 12 期間固定配列を生成して返す（0補完あり）。週は月曜始まり（`DATE_TRUNC('week', ...)`）、period は `YYYY-MM-DD` / `YYYY-MM` 形式。データなし期間は `{ period, postCount: 0, totalVolume: 0 }`。
- [Phase 11 / 11-1] 種目別集計は metric 自動切り替え: `weight_kg > 0` の記録があれば `metric: 'weight'`、なければ `reps >= 1` で `metric: 'reps'`、どちらもなければ `metric: 'none'`。DB は pg ドライバーが decimal を文字列で返す可能性があるため `Number()` で必ず明示変換する。
- [Phase 11 / 11-1] 自重記録（weight_kg=0）と加重記録（weight_kg>0）が混在する場合: `metric: 'weight'` を優先。加重記録がある日のみ `records` に含め、自重のみの日は除外する。
- [Phase 11 / 11-1] `limit` パラメータは「直近トレーニング日数」（`trained_on` の DISTINCT 日付で最新 N 日）。セット数・投稿数ではない。範囲: 1〜90、デフォルト 30。
- [Phase 11 / 11-1] 目標期限（deadline）のバリデーションは JST 基準。`Date.now() + 9 * 3600 * 1000` でオフセット加算後 ISO スライスで `YYYY-MM-DD` を取得。`new Date('YYYY-MM-DD')` の UTC 解釈（0時のずれ）を回避。バックエンドの `getJstToday()` を `src/common/utils/date.util.ts` に切り出してテストで `jest.mock` 可能にする。
- [Phase 11 / 11-1] `create()` 相関バリデーション: `targetWeightKg == null && targetReps == null` → `BadRequestException`。DTO バリデーション: `targetWeightKg` は `@Min(0.01) @Max(1000)`、`targetReps` は `@Min(1) @Max(10000)`。
- [Phase 11 / 11-1] `update()` でも `dto.deadline` が指定された場合は JST 過去日チェックを実施。
- [Phase 11 / 11-1] 別課題候補: `docs/database.md` に `personal_records` テーブル未記載。Phase 12 開始時の doc-sync で対処。

## OpenQuestions
- (none)

## ReviewStatus
- Phase 11: PR 未作成（Sub-phase 11-5 完了後に作成予定）
- Phase 10: PR #27 マージ済み（2026-06-24）
- Phase 9: PR #25 マージ済み（2026-06-19）

## MergeReadiness
- Phase 11: Sub-phase 11-1 完了。11-2〜11-5 完了後に PR 作成・マージ実施。

## NextAction
Sub-phase 11-3 コミット完了 → Sub-phase 11-4（GoalsPage を `pages/stubs/` から `pages/` へ移動・実装 + テスト）開始。

## References
- Plan（全体）: `docs/phase-roadmap.md`
- Issue: #28（Phase 11 / 進行中）、#26（Phase 10 / 完了）、#24（Phase 9 / 完了）、#22（Phase 8 / 完了）
- PR: #27（Phase 10 / マージ済み）、#25（Phase 9 / マージ済み）
- Branch: `feature/issue-28-phase11-stats-goals`（Phase 11 実装中）
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
