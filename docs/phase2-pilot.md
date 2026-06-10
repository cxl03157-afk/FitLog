# Phase 2 Pilot Playbook

> **旧運用資料 — 現行運用では参照しない**
> このドキュメントは Claude / Codex / Composer の多エージェント運用を検証した Phase 2 の記録です。
> Issue #10 により現行運用は **Claude Code 単独運用** に移行しました。
> 現行の手順は `CLAUDE.md`・`docs/agent-prompts.md`・`docs/phase-gates.md` を参照してください。

---

目的: フェーズ2（静的プロトタイプ）でエージェント切替運用が機能するかを検証し、テンプレを改善する。

---

## Pilot Scope

- 対象フェーズ: Phase 2（mock作成）
- UI方針: desktop-first（試作フェーズのため。モバイル最適化は後続フェーズで実施）
- 対象ロール順:
  1. Claude（計画）
  2. Codex（計画チェック）
  3. Composer（実装）
  4. Codex or Claude（レビュー）

---

## Step-by-Step

1. Start Gate 実施  
   - `docs/phase-gates.md` の「開始前チェック」を完了する。
2. Claude 実行  
   - `docs/agent-prompts.md` の Claude テンプレを使用。
3. Codex チェック  
   - `docs/agent-prompts.md` の Codex テンプレを使用。
4. Composer 実装  
   - `docs/handoff.md` の `NextAction` のみ実行。
5. レビュー  
   - `docs/agent-prompts.md` の レビュー テンプレを使用。
6. End Gate 実施  
   - `docs/phase-gates.md` の「終了時チェック」を完了する。

---

## Acceptance Criteria

- 切替ごとに追加説明なしで、次担当が以下を正しく再現できる:
  - 現在フェーズ
  - 直近の決定事項
  - 次の1アクション
- `docs/handoff.md` の `PilotFeedback` に改善点が残っている。

---

## Retro Template（PilotFeedback転記用）

- MissingContext:
  - 例: branch名が未記載で再探索が発生
- PromptAmbiguity:
  - 例: 「実行して」の範囲が曖昧でスコープ超過
- GateMiss:
  - 例: End Gateで `NextAction` 更新漏れ
- TemplateUpdate:
  - 次回から追加/修正するテンプレ項目
