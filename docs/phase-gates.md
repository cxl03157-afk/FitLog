# Phase Gate Checklist

フェーズ切替時に毎回使うチェックリストです。  
「開始前」「実行中」「終了時」を同じ形式で確認します。

---

## 1. 開始前チェック（Start Gate）

- [ ] `docs/context.md` を読み、現在フェーズと状況を把握した
- [ ] 必要なら `docs/handoff.md`、詳細 docs（`docs/features/` / `docs/screens.md` / `docs/database.md`）を参照した
- [ ] `docs/phase-roadmap.md` で対象フェーズの実施事項・完了条件を確認した
- [ ] `CLAUDE.md` の該当ルール（ブランチ命名・コミット・テスト方針等）を確認した
- [ ] 対象フェーズの詳細計画（実装順序・リスク・成果物）を立案し、ユーザーに提示した
- [ ] 計画をユーザーが承認した
- [ ] GitHub Issue を作成した（目的・完了条件を記載）
- [ ] main から作業ブランチを作成した（命名規則に従う）

---

## 2. 実行中チェック（In-Phase Gate）

- [ ] 重要な設計判断を `docs/handoff.md` の `Decisions` に追記した
- [ ] 新しい未解決事項を `OpenQuestions` に追記した
- [ ] スコープ外作業を実施していない
- [ ] 進捗が `Status` に反映されている
- [ ] 次のセッションが再開可能な情報が残っている

---

## 3. 終了時チェック（End Gate）

- [ ] フェーズの完了条件を満たしている（IssueのDoD基準）
- [ ] `/quality-check` の「完了報告前チェック」を全項目確認した
- [ ] テスト結果を規定フォーマット（Backend / Frontend / E2E）で記録した
- [ ] 失敗・未実施項目がある場合は「未実施」と明記した
- [ ] `docs/handoff.md` の `CurrentPhase` / `Status` / `NextAction` を更新した
- [ ] 次フェーズの開始条件を1-3行で明記した
- [ ] PR本文に `Closes #<issue>` が入っている

---

## 4. 切替直前チェック（Handoff Gate）

- [ ] `doc-sync` スキルを実行してドキュメント差異を確認した（差異があれば修正済み）
- [ ] 次に読むべきファイルを明記した（`CLAUDE.md`, `docs/handoff.md`, `docs/context.md`, 対象Issue）
- [ ] 対象Issue番号（`#<issue>`）を明示し、`docs/handoff.md` の `References` の Issue と一致していることを確認した
- [ ] 次担当向けに「次の1アクション」が1つだけ定義されている
- [ ] セルフレビューで確認すべき論点（仕様・セキュリティ・テスト）を残した

