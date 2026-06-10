# Agent Handoff

## CurrentPhase
- Phase 4 complete: 認証API実装（Issue #8）PR #9 merged（2026-06-10）
- Phase 3 complete: PR #7 merged, Issue #6 closed
- Phase 2 complete: PR #4 merged, Issue #3 closed

## Status
- Issue #8 完了・PR #9 マージ済み
- Issue #10: 運用ドキュメント書き換え中（docs/issue-10-claude-code-workflow ブランチ）

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

## OpenQuestions
- (none)

## ReviewStatus
- Status: セルフレビュー済み（Claude Code）
- Scope: Issue #10（ドキュメント運用移行）
- 確認済み: 多エージェント記述の削除・Claude Code 単独運用への統一

## MergeReadiness
- ReviewApproved: セルフレビュー済み
- CIGreen: N/A（docs-only PR のため Backend / Frontend CI 非対象）
- IssueLinkValid (`Closes #...`): true（Closes #10）
- ReadyToMerge: ユーザー承認待ち

## NextAction
PR #10（docs/issue-10-claude-code-workflow）をマージ後、Phase 5 の計画を開始する。

## References
- Plan（全体）: `/Users/user/.claude/plans/it-fitlog-er-noble-river.md`
- Issue: `#10` (運用ドキュメント書き換え)
- Branch: `docs/issue-10-claude-code-workflow`
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
