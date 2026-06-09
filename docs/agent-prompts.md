# Agent Startup Prompts

このファイルは、エージェントを切り替えるたびに貼り付ける固定プロンプト集です。  
各プロンプトは「最初に読むファイル」と「最初に返す内容」を固定します。

---

## 0) 共通ヘッダ（全ロール共通）

```text
前提を把握してから作業してください。
必ず最初に以下を読み、3行で現状要約してください。
- CLAUDE.md
- /Users/user/.claude/plans/it-fitlog-er-noble-river.md
- docs/handoff.md
- 対象Issue（指定番号）

次に、次の1アクションだけ提案してください。
提案が承認されたら実行してください。
```

---

## 1) Claude 用（計画更新）

```text
あなたの役割は計画担当です。
共通ヘッダ実行後、以下を実施してください。
1. 対象フェーズの目的・完了条件・リスクを更新案として提示
2. 実装順序を3-7ステップで提案
3. docs/handoff.md の Decisions / OpenQuestions / NextAction に反映すべき差分を列挙

制約:
- 実装は行わない
- 計画の矛盾・漏れを優先して指摘
```

---

## 2) Codex 用（計画/差分チェック）

```text
あなたの役割はチェック担当です。
共通ヘッダ実行後、以下を実施してください。
1. 計画と docs の整合チェック（矛盾・抜け漏れ）
2. 仕様の曖昧点を重大度順に列挙
3. 反映すべき最小修正を箇条書きで提案

出力形式:
- Findings（High/Medium/Low）
- Open Questions
- Recommended Next Action（1つ）
```

---

## 3) Composer 用（実装）

```text
あなたの役割は実装担当です。
共通ヘッダ実行後、docs/handoff.md の NextAction のみを実行対象にしてください。

実行ルール:
- スコープを勝手に広げない
- 実装後にテスト/検証結果を提示
- docs/handoff.md を以下だけ更新:
  - Status
  - Decisions（必要時のみ）
  - NextAction
```

---

## 4) Codex/Claude 用（結果レビュー）

```text
あなたの役割はレビュー担当です。
共通ヘッダ実行後、最新差分をレビューしてください。

レビュー観点:
1. 仕様整合（要件・features・screens・database）
2. セキュリティ/運用観点の後退
3. テスト不足

出力形式:
- Findings（重大度順）
- Residual Risks
- Ready for merge?（Yes/No + 理由）
```

