# Agent Handoff

## CurrentPhase
- Phase 8 complete: フロントエンド コメント・ナイス機能（Issue #22）PR #23 CI グリーン・レビュー待ち（2026-06-18）
- Phase 7-1 complete: workout-posts passwordHash 漏洩修正（Issue #20）PR #21 マージ済み（2026-06-17）
- Phase 7 complete: フロントエンド タイムライン・投稿機能（Issue #18）PR #19 マージ済み（2026-06-17）
- Phase 6 complete: フロントエンド基盤（Issue #16）PR #17 マージ済み（2026-06-17）
- Phase 5-1 complete: パーソナルレコード手動登録 API（Issue #14）PR #15 マージ済み（2026-06-12）
- Phase 5 complete: バックエンド API（Issue #12）PR #13 マージ済み（2026-06-11）
- Phase 4 complete: 認証API実装（Issue #8）PR #9 merged（2026-06-10）
- Phase 3 complete: PR #7 merged, Issue #6 closed
- Phase 2 complete: PR #4 merged, Issue #3 closed

## Status
- Issue #22 完了・PR #23 CI グリーン・レビュー待ち（2026-06-18）
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

## OpenQuestions
- (none)

## ReviewStatus
- Status: PR #23 CI グリーン・レビュー待ち（lint ✅ / test ✅ / build ✅ / CI ✅）

## MergeReadiness
- レビュー承認待ち（lint ✅ / test ✅ / build ✅ / CI ✅）

## NextAction
PR #23 レビュー承認 → マージ。
マージ後、Phase 9（S3 画像アップロード）の計画案を提示する。

## References
- Plan（全体）: `docs/phase-roadmap.md`
- Issue: #22（Phase 8）、#20（Phase 7-1 / 完了）、#18（Phase 7 / 完了）、#16（Phase 6 / 完了）
- PR: #23（feature/issue-22-phase8-comment-like / CI グリーン・レビュー待ち）、#21（マージ済み）、#19（マージ済み）
- Branch: `feature/issue-22-phase8-comment-like`（main へ PR 中）
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
