# Phase Gate Checklist

フェーズ切替時に毎回使うチェックリストです。  
「開始前」「実行中」「終了時」を同じ形式で確認します。

---

## 1. 開始前チェック（Start Gate）

- [ ] 対象Issueがあり、目的と完了条件が明記されている
- [ ] 作業ブランチが命名規則どおりに作成されている
- [ ] `docs/handoff.md` の `CurrentPhase` と `NextAction` が更新されている
- [ ] 参照順（`CLAUDE.md` → 要件 → features → screens → database → handoff）を確認した
- [ ] このフェーズの担当ロール（Claude/Codex/Composer/Reviewer）が明確

---

## 2. 実行中チェック（In-Phase Gate）

- [ ] 重要な設計判断を `docs/handoff.md` の `Decisions` に追記した
- [ ] 新しい未解決事項を `OpenQuestions` に追記した
- [ ] スコープ外作業を実施していない
- [ ] 進捗が `Status` に反映されている
- [ ] 次の担当エージェントが再開可能な情報が残っている

---

## 3. 終了時チェック（End Gate）

- [ ] フェーズの完了条件を満たしている（IssueのDoD基準）
- [ ] 検証結果（テスト/確認項目）を記録した
- [ ] `docs/handoff.md` の `CurrentPhase` / `Status` / `NextAction` を更新した
- [ ] 次フェーズの開始条件を1-3行で明記した
- [ ] PR本文に `Closes #<issue>` が入っている

---

## 4. 切替直前チェック（Handoff Gate）

- [ ] 次に読むべきファイル4点を明記した（`CLAUDE.md`, 計画, `docs/handoff.md`, 対象Issue）
- [ ] 対象Issue番号（`#<issue>`）を明示し、`docs/handoff.md` の `References` の Issue と一致していることを確認した
- [ ] 次担当向けに「次の1アクション」が1つだけ定義されている
- [ ] レビュー担当が確認すべき論点（仕様・セキュリティ・テスト）を残した

