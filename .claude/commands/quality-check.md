@.claude/skills/doc-sync/SKILL.md

# 品質チェックルール

このプロジェクトの品質担保のために、機能実装後に以下のチェックを実施すること。

## フロントエンド

### ESLint チェック（必須）
```bash
cd frontend
npm run lint
```
エラー 0 件を確認すること。

### TypeScript 型チェック（必須）
```bash
cd frontend
npx tsc --noEmit
```

### Vitest ユニットテスト（必須）
```bash
cd frontend
npm test
```

### CI向け実行モード
- [ ] ウォッチモードではなく単発実行で確認すること（ローカル待ち状態でチェックが止まらないようにする）

### ビルド確認（必須）
```bash
cd frontend
npm run build
```
`tsc -b` による型チェックを含む。lint + test が通っても build で型エラーが出る場合があるため必須。

### チェックポイント
- [ ] `useEffect` の依存配列に漏れがないか
- [ ] 使われていない型・コンポーネント・ファイルが残っていないか
- [ ] axios レスポンスに適切なエラーハンドリングがあるか
- [ ] AccessToken の 401 エラー時に RefreshToken でリトライしているか
- [ ] httpOnly Cookie の操作を JS から直接行っていないか
- [ ] `.env.local` が存在し `VITE_API_BASE_URL` 等の必須環境変数が設定されているか（新規クローン時は `cp .env.example .env.local`）

### Axios interceptor チェックポイント
リフレッシュトークン付き interceptor を実装・変更した場合は以下を必ず確認すること。

- [ ] `/api/auth/refresh` 自体が 401 を返したとき、再度 refresh を呼ばないようにしているか（無限ループ防止）
- [ ] `_retry` フラグで同一リクエストの二重リトライを防いでいるか
- [ ] `isRefreshing` フラグで並列 401 リクエストのキューイングを制御しているか

### E2E / Playwright チェックポイント

**スクリプト作成前の確認**
- [ ] 判定対象のコンポーネント実装と実際の DOM 構造を確認してからスクリプトを書いた

**状態判定のルール**
- [ ] 見た目・状態の判定に曖昧な部分一致を使っていない
  - NG: `cls.includes('orange')` （`hover:text-orange-400` も一致してしまう）
  - OK: `await expect(btn).toHaveClass('text-orange-500')`
  - より推奨: `aria-pressed` / `data-state` / `data-testid` 属性で判定する
- [ ] 状態変化を伴う UI（トグル・削除確認等）は操作前後の2状態を両方検証した

**FAIL 時の切り分け手順**
- FAIL を見た時点でスクリプトバグと決めつけず、以下の順で実装側を先に切り分ける
  1. `page.on('pageerror')` でページ内 TypeError / ReferenceError を確認する
  2. `page.on('console', msg => ...)` でコンソールエラーを確認する
  3. ネットワークエラー（401 / 500 等）を確認する
  4. 上記で実装バグの根拠がなければスクリプト側を疑う

**data-testid / data-state の適用方針**
- 全コンポーネントへの一斉適用はしない
- ナイスボタン・削除確認・コメント投稿フォームなど **E2E で状態変化を検証する重要 UI** に限定して段階的に追加する

---

## バックエンド

### Jest テスト実行（必須）
```bash
cd backend
npm test
```
全テストパスを確認すること。

### CI向け実行モード
- [ ] ウォッチモードではなく単発実行で確認すること（ローカル待ち状態でチェックが止まらないようにする）

### TypeScript 型チェック
```bash
cd backend
npx tsc --noEmit
```

### チェックポイント
- [ ] 新しいエンドポイントに `@UseGuards(JwtAuthGuard)` が適切に付いているか
- [ ] 認証不要なエンドポイント（`/api/auth/**`）がガード対象から除外されているか
- [ ] TypeORM で N+1 問題が発生していないか（`relations` または QueryBuilder を使用）
- [ ] バリデーション（class-validator）が入力値の境界値を正しくチェックしているか
- [ ] エラーレスポンスが適切な HTTP ステータスコード（400/401/403/404）を返しているか

### FitLog 固有チェックポイント
- [ ] `likes` テーブルの UNIQUE 制約（`workout_post_id`, `user_id`）で二重ナイスが防止されているか
- [ ] `follows` テーブルの UNIQUE 制約（`follower_id`, `followee_id`）で二重フォローが防止されているか
- [ ] `follows` テーブルの CHECK 制約（`follower_id <> followee_id`）で自己フォローが防止されているか
- [ ] RefreshToken は raw token を保存せず token_hash（SHA-256）を保存しているか
- [ ] RefreshToken がセッション単位（`session_id`）で管理され、個別端末失効ができるか
- [ ] `replaced_by_token_id` でローテーション連鎖を追跡し、失効済みトークン再利用を検知できるか
- [ ] 画像アップロード時に S3 object key に UUID を含む一意なキーを生成しているか
- [ ] 投稿削除時に関連する S3 ファイルも連動削除しているか
- [ ] `user` リレーションをレスポンスに含める場合、`passwordHash` 等の機密フィールドが返らないことを curl またはテストで確認した
- [ ] `@Exclude()` に依存するレスポンスでは、対象 Controller に `@UseInterceptors(ClassSerializerInterceptor)` が適用されていることを確認した

### テスト実装後の計画照合（必須）

テストを書き終えたら、実装計画の各テスト項目と実際のアサーションを 1 対 1 で突き合わせること。

- [ ] 計画に列挙した全テスト項目に対応するテストケースが存在するか
- [ ] `（ログ記録を確認）` など、実装計画で検証条件として記載された注記に対応する独立したアサーション（例: `expect(loggerSpy).toHaveBeenCalledWith(...)`）を実装したか
- [ ] controller / interceptor 層にバリデーションを追加・変更した場合、その境界値・エラーケースが integration test でカバーされているか

---

## 実装計画チェックリスト（計画提示前に確認）

複数ステップの更新処理、または DB・S3・外部 API・メール・キュー・ファイル処理など複数の副作用にまたがり、部分成功や不整合が起こり得る場合は、計画提示前に以下の観点で異常系設計を作成し、計画内に含めること。**異常系設計が提示されない場合は Issue 作成・実装へ進まない。**

### 異常系設計の確認項目

以下の観点がすべて設計表に含まれていることを確認する：

- [ ] 処理順序（どの操作が何番目に行われるか）
- [ ] 失敗地点（各操作のどの時点で失敗し得るか）
- [ ] 部分成功時の状態（一部の操作が成功した後で後続が失敗した場合に何が残るか）
- [ ] 対処方針（ロールバック / 補償処理 / 処理継続 / 処理中止 / ログ記録のうち採用するもの）
- [ ] 対処処理自体の失敗方針（ロールバック等が失敗した場合の方針も明記）
- [ ] 利用者・呼出元への結果（API 処理の場合: HTTP ステータスコードとクライアントへ返すエラー形式 / 非同期・バッチ処理の場合: 再試行・失敗記録・通知の方針）
- [ ] ログ記録を対処方針に含める場合、logger が期待する内容で呼ばれることをテスト項目へ明記した
- [ ] テスト方法（unit test / integration test / curl / Playwright / 未実施予定（理由）のいずれか）

### 異常系設計表（推奨フォーマット）

| 操作・失敗地点 | 失敗後の状態 | 対処方針 | 利用者・呼出元への結果 | テスト方法 |
|--------------|------------|---------|---------------------|----------|
| 例: S3 upload（1枚目成功・2枚目失敗） | S3 に 1 枚残る・DB 未書込 | ロールバック（deleteMany で削除） | 500 / クライアント向けの一般化されたエラー | unit test |
| 例: DB INSERT 失敗 | S3 に全枚数残る・DB 未書込 | ロールバック（deleteMany で削除） | 500 / クライアント向けの一般化されたエラー | unit test |
| 例: ロールバック（deleteMany）失敗 | S3 に残存・DB 未書込 | ログ記録のみ・元例外を再 throw | 500 / クライアント向けの一般化されたエラー | unit test（logger spy） |

---

## doc-sync ゲート（3段階）

### ゲート1: 計画開始時（必須）

フェーズ計画を提示する前に以下を実施する：

1. `docs/context.md`・`docs/phase-roadmap.md` を確認し、現フェーズの位置づけを把握する
2. `doc-sync` スキルを実行し、**今回のフェーズに関係する実装・ドキュメントの範囲に限定して**差異を確認する
3. 差異を検出しても自動修正せず、**差異内容・修正案・対象ファイルを提示してユーザー承認を得てから修正する**
4. スコープ外の差異は「別課題候補」として報告し、ユーザー承認なく同フェーズへ含めない
5. 更新が見込まれるドキュメントを実装計画に明記する
6. ユーザー承認後に Issue 作成・実装へ進む

### ゲート2: 実装中の仕様変更（必須）

承認済み計画または既存ドキュメントから以下を変更する場合は **その場で作業を止める**：

- HTTP メソッド（GET / POST / PUT / PATCH / DELETE）
- API パス
- リクエスト / レスポンスのフィールド・型
- ファイル制約（MIME タイプ・最大サイズ）
- DB スキーマ（カラム型・制約・インデックス）
- 認証・認可の仕様
- エラーレスポンスの仕様

作業を止めたら以下を提示してユーザー承認を得る：

```
変更理由: <理由>
影響範囲: <影響するコード・テスト・ドキュメント>
更新対象ドキュメント: <docs/features/*.md 等>
```

承認後に変更し、関連ドキュメントへの更新を計画に追記する。

### ゲート3: PR 作成前（必須）

PR 案を提示する前に最終 doc-sync を実行する。

- 差異を検出しても自動修正せず、**差異内容・修正案・対象ファイルを提示してユーザー承認を得てから修正する**
- 未解消差異がある場合は**ユーザーが明示的に許可しない限り PR 案の提示へ進まない**
- 以下のフォーマットで報告してから PR 案へ進む：

```
doc-sync:
- 実施: 済
- 確認対象: <ファイル一覧>
- 差異: なし / 修正済み（修正内容を記載）
- 未解消差異: なし / 内容（理由を記載）
```

---

## ドキュメント整合チェック

- [ ] `README.md` の機能一覧が実装と一致しているか
- [ ] `docs/tech-stack.md` の技術スタック・バージョンが実際に使用されているか
- [ ] `docs/features/` の API 設計と実装エンドポイントが一致しているか
- [ ] `docs/database.md` のテーブル定義が TypeORM Entity と一致しているか

必要に応じて `doc-sync` スキルを実行してドキュメント差異を確認すること。

---

## 過去に発見した問題（再発防止）

| 問題 | 対策 |
|------|------|
| S3 sync で `images/` 配下のユーザー画像が削除される | `--exclude "images/*"` を必ず付ける。`--dryrun` で事前確認 |
| CloudFront 経由の `/api/*` エラーが index.html に変換される | CloudFront Function（spaRouting.js）で `/api/*` を除外 |
| RefreshToken の Cookie が本番で送信されない | `SameSite=Strict`, `Secure=true`, `Domain` を正しく設定する |
| `.env.local` がなく `VITE_API_BASE_URL` が `undefined` になり API 呼び出しが全て失敗する | 起動前に `cp .env.example .env.local` を実行。または `client.ts` で `if (!baseURL) throw new Error(...)` を入れて起動時に気づけるようにする |
| Axios interceptor で `/api/auth/refresh` が 401 を返すと無限ループになる | interceptor のスキップ条件に `originalRequest.url === '/api/auth/refresh'` を追加する |
| `createComment` 等の create 系 API がリレーション未ロードで返す | 保存後に `findOneOrFail({ relations: { user: true } })` で再取得する |
| フロント型定義に `user` フィールドを追加したが実 API が返さない | 型変更時は必ず curl で実レスポンスと照合する |
| Playwright FAIL をスクリプトバグと決めつけて実装バグを見逃す | FAIL は実装・スクリプト両方を調査し、根拠を示してから判断する |

---

## 完了報告ルール

### 1. 手動確認を完了条件として扱う

- Playwright または手動確認が PASS するまで「実装完了」とは言わない
- 自動テスト（Jest/Vitest/build）PASS だけで完了と判断しない

### 2. FAIL/ERROR の調査方針

- FAIL はスクリプトバグと決めつけない。**実装側・スクリプト側の両方を調査**し、根拠を示してから判断する
- Playwright FAIL 時は `page.on('pageerror')` / `page.on('console')` / ネットワークエラーを確認する

### 3. 新規・変更 API の確認（フロント型との照合）

- create / update 系エンドポイントを追加・変更した場合は curl で実レスポンスを取得する
- フロントエンドの型定義（`types/*.ts`）のフィールドと curl レスポンスのフィールドを **1対1で照合**する
- `passwordHash` 等の機微フィールドがレスポンスに含まれていないことを確認する

### 4. 未実施項目の明記

- 実施できなかった確認項目は「未実施」と明記する。沈黙・省略は禁止

### 5. curl 確認の進め方（新規・変更 API がある場合）

- curl 確認を始める**前**に「今回確認する項目一覧」をユーザーへ提示すること
- 確認後は各項目を **PASS / FAIL / 未実施（理由）** で明記する
- 「環境制約で困難」と判断した項目はその場で「未実施」として報告し、unit test 等の代替カバレッジを示す
- 沈黙・省略禁止。確認できなかった項目を「確認完了」として扱わない

---

## テスト結果フォーマット（報告時に必ず使用）

```
## テスト結果

### Backend
- lint: PASS / FAIL
- unit test: PASS / FAIL（X / Y passed）
  - ファイル名.spec.ts: X passed
  - ...
- build: PASS / FAIL
- integration test: PASS / FAIL（X / Y passed）
  - ファイル名.integration-spec.ts: X passed
  - ...

### Frontend
- lint: PASS / FAIL
- unit test: PASS / FAIL（X / Y passed）
  - ファイル名.test.tsx: X passed
  - ...
- build: PASS / FAIL

### E2E / 手動確認
- Playwright: PASS / FAIL / 未実施
  - [ ] テスト項目名: PASS / FAIL
  - [ ] ...
- curl API確認: PASS / FAIL / 未実施
  - 確認内容: 結果

### 失敗・未実施がある場合
- 内容:
- 原因:
- 対応:
- 残課題:
```

---

## PR 作成前チェック

→ **doc-sync ゲート（3段階）のゲート3** を参照すること。

---

## 完了報告前チェック（報告前に必ず確認）

- [ ] `git diff` で変更内容を確認した
- [ ] backend lint / unit test / build をすべて実行した
- [ ] frontend lint / unit test / build をすべて実行した
- [ ] 変更対象の画面をブラウザ（Playwright または手動）で確認した
- [ ] 新規・変更 API の実レスポンスを curl で確認した
- [ ] フロント型定義と実 API レスポンスのフィールドを照合した
- [ ] `passwordHash` がレスポンスに含まれないことを確認した
- [ ] Playwright FAIL があれば console / pageerror / network を診断した
- [ ] 失敗・未実施項目を隠さず「未実施」と明記した
- [ ] テスト結果を規定フォーマットで整理した
- [ ] 実装計画の全テスト項目と実際のテストケースを 1 対 1 で照合した
- [ ] 実装計画で検証条件として記載された括弧内注記に、対応するアサーションが追加されていることを確認した
- [ ] 新規・変更 API がある場合、curl 確認前に項目一覧をユーザーへ提示し、確認困難な項目は「未実施（理由）」として代替カバレッジを明示した
