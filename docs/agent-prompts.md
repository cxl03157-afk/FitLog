# Claude Code 起動プロンプト集

このファイルは Claude Code（Cursor 拡張）でセッションを開始するときに貼り付ける固定プロンプト集です。

**運用モデル**: Claude Code 単独。外部エージェント（Codex / Composer）は使用しない。

---

## 0) セッション開始（標準）

```text
FitLog プロジェクトの作業を引き継いでください。

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

## 1) 計画フェーズ起動

```text
FitLog プロジェクトの作業を引き継いでください。

docs/context.md を読んで現状を把握後、以下を実施してください。
1. 対象フェーズの目的・完了条件・リスクを更新案として提示
2. 実装順序を 3〜7 ステップで提案
3. docs/handoff.md の Decisions / OpenQuestions / NextAction に反映すべき差分を列挙

制約:
- 実装は行わない
- 計画の矛盾・漏れを優先して指摘
- 承認後に実装フェーズへ移行する
```

---

## 2) 実装フェーズ起動

```text
FitLog プロジェクトの作業を引き継いでください。

docs/context.md を読んで現状を把握後、NextAction のみを実行対象にしてください。

実行ルール:
- スコープを勝手に広げない
- 実装後にテスト/検証結果を提示
- PR 作成前にユーザーへ連絡する
- docs/handoff.md は別 PR で更新する（コード PR に混在させない）
```

---

## 3) セルフレビュー

```text
FitLog プロジェクトの作業を引き継いでください。

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

- フェーズ切替時は必ず `docs/context.md` を最新化してから次のセッションを開始する
- `docs/handoff.md` の更新はコードと別コミット・別 PR にする
