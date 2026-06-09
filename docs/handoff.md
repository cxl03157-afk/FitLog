# Agent Handoff

## CurrentPhase
- Phase 2 complete (static prototype implemented and verified)
- PR #4 open; Issue #3 closes on merge
- Next phase: Phase 3 (local development environment setup)

## Status
- `mock/` に全11画面の静的プロトタイプ（HTML + Tailwind CDN + vanilla JS）を実装した
- 画面遷移・モック認証（登録/ログイン）・フォロー・アンフォロー・投稿 CRUD・コメント・目標・統計・セッション管理 UI を実装した
- ローカルでの画面確認を完了した（`cd mock && python3 -m http.server 8766`）
- `feature/issue-3-phase2-mock` にコミットし、PR #4 を作成した（`Closes #3`）

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

## OpenQuestions
- (none)

## ReviewStatus
- Status: 未着手
- Scope: Phase 2 Mock（`mock/` 一式）
- ReviewFocus:
  - `docs/screens.md` との画面仕様一致
  - 11画面の遷移整合（リンク切れなし）
  - モック認証（登録/ログイン）と状態遷移
  - 投稿作成/編集/削除、コメント、フォロー、目標、統計、セッション管理UIの主要操作
  - 既知の制約（desktop-first、mockデータ/`sessionStorage`）の明示
- ExitCriteria:
  - 指摘対応完了
  - 再確認完了
  - レビュー承認

## MergeReadiness
- ReviewApproved: false
- CIGreen: false
- IssueLinkValid (`Closes #...`): true
- ReadyToMerge: false

## NextAction
- PR #4 のレビューを実施し、指摘事項を確定する。

## References
- Plan: `/Users/user/.claude/plans/it-fitlog-er-noble-river.md`
- Issue: `#5` (Phase 3: ローカル開発環境構築 — 作成予定)
- PR: `#4` (Phase 2 mock — merge待ち, `Closes #3`)
- Branch: `feature/issue-5-phase3-dev-env`（作成予定）
- Repository: `https://github.com/cxl03157-afk/FitLog`

## UpdateRules
- Update this file at phase start, after every major decision, and at phase end.
- Keep `NextAction` as one concrete executable step.
- Never leave `OpenQuestions` stale after a decision is made.
- Keep `ReviewStatus` and `MergeReadiness` updated from PR creation to merge.

## PilotFeedback
- (empty) Fill after Phase 2 pilot:
  - What context was missing at agent switch?
  - Which prompt text was ambiguous?
  - Which checklist item failed to prevent confusion?
