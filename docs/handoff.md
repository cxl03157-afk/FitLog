# Agent Handoff

## CurrentPhase
- Phase 3 in progress (local development environment setup)
- Issue #6 open; branch `feature/issue-6-phase3-dev-env` created from `main`
- Phase 2 complete: PR #4 merged, Issue #3 closed

## Status
- Phase 3 Issue #6 を作成した
- `feature/issue-6-phase3-dev-env` ブランチを `main` から作成した
- 実装完了・コミット済み（commit: 06cdf91）
- Phase 2 の成果物（`mock/`）と運用ルールは `main` に取り込み済み
- PR #7 作成済み（レビュー・CI 確認待ち）

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
- [Phase 3] `backend/` には TypeORM パッケージ導入 + DataSource 設定ファイルの雛形まで置く（DB 実接続は Phase 4）。
- [Phase 3] Node 22 は CI で強制する（`actions/setup-node@v4` + `.nvmrc`）。
- [Phase 3] Tailwind CSS は v3（`tailwind.config.js` + `postcss.config.js`）で導入する。

## OpenQuestions
- (none)

## ReviewStatus
- Status: 未着手（Phase 3 実装後に実施）
- Scope: Phase 3（`frontend/`, `backend/`, `docker-compose.yml`, `.github/workflows/`）
- ReviewFocus:
  - フロント・バック両方で `npm run lint` / `npm test` がパスすること
  - `docker compose up -d` で PostgreSQL 17 + LocalStack が起動すること
  - GitHub Actions CI（backend-ci / frontend-ci）がグリーンになること
  - `.env.example` に必要な環境変数が全て記載されていること
- ExitCriteria:
  - CI グリーン
  - 指摘対応完了
  - レビュー承認

## MergeReadiness
- ReviewApproved: false
- CIGreen: false（CI 実行中）
- IssueLinkValid (`Closes #...`): true（PR #7 に `Closes #6` 記載済み）
- ReadyToMerge: false

## NextAction
- PR #7 のレビューを実施する（CI グリーン確認 → レビュー承認 → main マージ）。

## References
- Plan（全体）: `/Users/user/.claude/plans/it-fitlog-er-noble-river.md`
- Plan（Phase 3 詳細）: `/Users/user/.cursor/plans/phase_3_dev_env_plan_86ceed28.plan.md`
- Issue: `#6` (Phase 3: ローカル開発環境構築)
- PR: `#4` (Phase 2 mock — merged, `Closes #3`)
- Branch: `feature/issue-6-phase3-dev-env`
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
