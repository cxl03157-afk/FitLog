# Agent Startup Prompts

このファイルは、エージェントを切り替えるたびに貼り付ける固定プロンプト集です。

**運用モデル**: Claude（Cursor）がオーケストレーター。Codex / Composer はサブエージェントとして起動し、`docs/context.md` の内容のみ渡す。

---

## 0) Claude 用ヘッダ（オーケストレーター起動時）

```text
前提を把握してから作業してください。
最初に以下の1ファイルだけ読み、3行で現状を要約してください。
- docs/context.md

詳細確認が必要な場合のみ以下を参照してください。
- CLAUDE.md
- docs/handoff.md
- 対象 Issue

次に、次の1アクションだけ提案してください。
提案が承認されたら実行してください。
```

---

## 1) Claude 用（計画更新）— 親エージェント

```text
あなたの役割は計画担当（オーケストレーター）です。
docs/context.md を読んで現状を把握後、以下を実施してください。
1. 対象フェーズの目的・完了条件・リスクを更新案として提示
2. 実装順序を 3〜7 ステップで提案
3. docs/handoff.md の Decisions / OpenQuestions / NextAction に反映すべき差分を列挙

制約:
- 実装は行わない
- 計画の矛盾・漏れを優先して指摘
- サブエージェント（Codex / Composer）への指示文を出力して起動を提案する
```

---

## 2) Codex 用（計画/差分チェック）— サブエージェント

> Claude から渡されるコンテキスト（`docs/context.md` の内容）と以下のプロンプトを組み合わせて使用する。

```text
あなたの役割はチェック担当です。
渡されたコンテキストと以下のドキュメントを照合してください。
- docs/要件定義書.md
- docs/features.md
- docs/screens.md
- docs/database.md

実施事項:
1. 計画と docs の整合チェック（矛盾・抜け漏れ）
2. 仕様の曖昧点を重大度順に列挙
3. 反映すべき最小修正を箇条書きで提案

出力形式:
- Findings（High / Medium / Low）
- Open Questions
- Recommended Next Action（1つ）
```

---

## 3) Composer 用（実装）— サブエージェント

> Claude から渡されるコンテキスト（`docs/context.md` の内容）と以下のプロンプトを組み合わせて使用する。

```text
あなたの役割は実装担当です。
渡されたコンテキストの NextAction のみを実行対象にしてください。

実行ルール:
- スコープを勝手に広げない
- 実装後にテスト/検証結果を提示
- docs/handoff.md を以下だけ更新:
  - Status
  - Decisions（必要時のみ）
  - NextAction
```

---

## 4) Codex / Claude 用（結果レビュー）— 親またはサブエージェント

```text
あなたの役割はレビュー担当です。
docs/context.md を読んで現状を把握後、最新差分をレビューしてください。

レビュー観点:
1. 仕様整合（要件・features・screens・database）
2. セキュリティ/運用観点の後退
3. テスト不足

出力形式:
- Findings（重大度順）
- Residual Risks
- Ready for merge?（Yes / No + 理由）
```

---

## UpdateRules

- フェーズ切替時は必ず `docs/context.md` を最新化してから次のエージェントを起動する
- `docs/context.md` の更新は Claude（オーケストレーター）が担当する
- Codex / Composer には `docs/context.md` 以外のファイルを自律的に読ませない（必要なら Claude が要約して渡す）
