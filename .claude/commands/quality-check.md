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
