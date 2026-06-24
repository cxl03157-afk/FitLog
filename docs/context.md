# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **10 完了・マージ準備完了 → 11 未着手**（週間/月間集計・目標設定）
- Issue: #26（Phase 10 / PR #27 マージ時にクローズ予定）
- Branch: `feature/issue-26-phase10-frontend`（PR #27 マージ直前）
- Status: Phase 10 全 Sub-phase（10-1〜10-7）完了。CI 3ジョブ PASS・レビュー確認済み。PR #27 の最終マージ待ち。

## 技術スタック

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）+ LocalStack 3（S3 エミュレーション、Phase 9 追加）
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 9 確定決定事項

| 項目 | 決定 |
|------|------|
| S3 モジュール | @Global() 不使用。WorkoutPostsModule / UsersModule で明示的にインポート |
| Multer storage | memoryStorage（S3 中継のため） |
| ファイル検証 | fileFilter（mimetype）+ limits.fileSize（10MB）。MIME は image/jpeg・png・webp のみ許可 |
| S3 key 形式 | `images/posts/{postId}/{uuid}.{ext}` / `images/avatars/{userId}/{uuid}.{ext}` |
| 表示 URL | `IMAGE_BASE_URL + "/" + imageKey`（DB に URL は保存しない） |
| 本番切り替え | AWS_S3_ENDPOINT を省略するだけで実 AWS S3 に接続する設計 |
| アップロードエラー時 | アップロード済みキーを deleteMany でロールバック。rollback 失敗はログのみ、元例外を再 throw |
| remove() のエラー | S3 削除失敗はログのみ、DB 削除は継続 |
| TypeORM select | FindOptionsSelect は配列不可（TS2559）→ オブジェクト形式 `{ field: true }` が必須 |

## Phase 8 確定決定事項

| 項目 | 決定 |
|------|------|
| likeCount / commentCount / isLiked | GET /api/workout-posts・GET /api/workout-posts/:id のレスポンスに集計フィールドを追加（サブクエリ方式） |
| CommentsController | `@UseInterceptors(ClassSerializerInterceptor)` 適用（passwordHash 漏洩防止） |
| createComment レスポンス | save 後に `findOneOrFail({ relations: { user: true } })` で再取得（user 未ロード → TypeError 防止） |
| コメント文字数上限 | 280 文字（`@MaxLength(280)`）。フロント・バック統一 |
| コメント投稿 | 楽観的更新なし。API 成功後のレスポンスを末尾に追加 |
| ナイストグル 409 処理 | 409 Conflict は isLiked=true に寄せ、likeCount は prevCount に戻して二重加算を防止 |
| PostCard 構造 | `<article>` でラップ。ナイスボタンは `<Link>` 外に配置 |
| Playwright クラス判定 | `includes('orange')` 禁止（hover クラスと一致）。`includes('text-orange-500')` または `data-testid` を使う |

## Phase 7-1 確定決定事項

| 項目 | 決定 |
|------|------|
| 修正スコープ | passwordHash のみ @Exclude()。他フィールド（email/avatarKey 等）は対象外 |
| 適用範囲 | WorkoutPostsController のみ（グローバル適用は他エンドポイントへの影響リスクのため回避） |
| テスト方針 | Controller + supertest で HTTP レスポンスを検証（ClassSerializerInterceptor は HTTP パイプライン経由でのみ動作） |
| User インスタンス | Object.assign(new User(), {...}) 必須（plain object では @Exclude() が機能しない） |

## Phase 7 確定決定事項

| 項目 | 決定 |
|------|------|
| trainedOn 初期値 | ローカル日付（new Date() のローカルメソッド使用）。toISOString().slice(0,10) は UTC 基準のため不可 |
| フォロー中タブ | UI は表示、API 呼び出しなし・Phase 10 プレースホルダー表示 |
| 削除確認 | window.confirm 禁止。showDeleteConfirm state でインライン表示 |
| transaction バグ修正 | dataSource.transaction 内で this.findOne() 呼び出し禁止。createdId を外に持ち出してコミット後に呼ぶ |

## Phase 6 確定決定事項

| 項目 | 決定 |
|------|------|
| User 型 | `{ id, username, displayName, email }` の4フィールド（avatarUrl/bio は login/refresh レスポンス非含有のため Phase 10 で追加） |
| AccessToken 管理 | モジュールスコープ変数（メモリ保持）。setAccessToken / getAccessToken で AuthContext と共有 |
| ProtectedRoute / GuestRoute | `<Outlet />` パターン（React Router v6） |
| Axios interceptor | `/api/auth/refresh` への 401 はリトライしない（無限ループ防止） |
| フロントエンド CI | Lint + Type Check + Test + **Build** ステップ追加 |
| .env.local | `.env.example` からコピー必須（`VITE_API_BASE_URL=http://localhost:3000`） |

## Phase 5 確定決定事項

| 項目 | 決定 |
|------|------|
| exercises 認証 | GET /api/exercises は認証必須（@UseGuards(JwtAuthGuard)） |
| DECIMAL transformer | pg ドライバーが string 返し → TypeORM transformer で parseFloat |
| updatedAt 明示更新 | repository.update() では @UpdateDateColumn 非発火 → updatedAt: new Date() |
| limit 上限 | query DTO に @Max(100) 追加（無制限ページサイズ防止） |

## Phase 4 確定決定事項

| 項目 | 決定 |
|------|------|
| Cookie | HttpOnly, SameSite=Strict, Path=/api/auth |
| Cookie Secure | 本番: true、ローカル: false（NODE_ENV で切り替え） |
| DELETE /api/auth/sessions | 現在端末を除く全セッションを無効化 |
| レート制限 | login: 10回/分、refresh: 20回/分（IP + email 識別） |
| トークン削除保持期間 | revoked_at / expires_at から 30 日後 |
| 監査ログ | NestJS Logger JSON 形式（専用テーブル不要） |
| 機微情報マスキング | token/cookie/password をログでマスク |
| CORS | フロントエンドのオリジンのみ許可 |

## Phase 10 確定決定事項

| 項目 | 決定 |
|------|------|
| follows service N+1 回避 | getFollowers/getFollowing を QueryBuilder + LEFT JOIN に変更し isFollowing を一括取得 |
| 現在端末ログアウト | logout API（POST /api/auth/logout）のみ使用。finally で AuthContext クリア → /login |
| logout 失敗時 | エラートースト表示、finally で強制 AuthContext クリア。HttpOnly Cookie は残る可能性あり |
| E2E username 形式 | `e2e${workerIndex.toString(36)}${Date.now().toString(36)}.slice(0,20)`（英数字のみ、20文字以内） |
| Search DTO | @IsString @Transform(trim) @Matches(/\S/) @MaxLength(20)。limit: @Type(Number) @IsInt @Min(1) @Max(50) default=20 |
| bio 空文字処理 | 空文字 or trim後空文字 → null として保存 |
| 画像 API 失敗後 | 投稿は維持してタイムラインへ。トースト「投稿は保存されましたが画像のアップロードに失敗しました」 |
| Object URL 管理 | SelectedImage = { file, previewUrl }。削除は個別 revoke、アンマウントは ref 経由で全解放 |

## NextAction

Phase 10 完了ドキュメントをコミットして PR #27 へ追加 push → 再実行 CI を確認 → ユーザーへ最終 merge 承認を依頼 → merge → main 同期と Issue #26 クローズを確認 → Phase 11 開始。

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 全体フェーズ計画（Phase 1〜18）: `docs/phase-roadmap.md`
- 認証仕様: `docs/features/01_auth.md`
- DB 設計: `docs/database.md`
- 状態詳細: `docs/handoff.md`
- Issue: #26（Phase 10）、#24（Phase 9 / 完了）、#22（Phase 8 / 完了）、#20（Phase 7-1 / 完了）、#18（Phase 7 / 完了）、#16（Phase 6 / 完了）
