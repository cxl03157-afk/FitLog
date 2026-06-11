# Agent Handoff

## CurrentPhase
- Phase 5 complete: バックエンド API（Issue #12）PR #13 CI グリーン・レビュー待ち（2026-06-11）
- Phase 4 complete: 認証API実装（Issue #8）PR #9 merged（2026-06-10）
- Phase 3 complete: PR #7 merged, Issue #6 closed
- Phase 2 complete: PR #4 merged, Issue #3 closed

## Status
- Issue #12 完了・PR #13 CI グリーン・レビュー待ち（2026-06-11）
- Phase 5-1（パーソナルレコード手動登録）追加決定
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

## OpenQuestions
- (none)

## ReviewStatus
- Status: PR #13 CI グリーン・レビュー待ち（lint ✅ / test ✅ / build ✅ / CI ✅）

## MergeReadiness
- マージ可（lint ✅ / test ✅ / build ✅ / CI ✅ / レビュー承認待ち）

## NextAction
PR #13 マージ後、Phase 5-1（パーソナルレコード手動登録）の計画を立ててから Issue を発行する。

## References
- Plan（全体）: `docs/phase-roadmap.md`
- Issue: #12（Phase 5）
- PR: #13（feature/issue-12-phase5-backend-api）
- Branch: `feature/issue-12-phase5-backend-api`（main へ PR 中）
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
