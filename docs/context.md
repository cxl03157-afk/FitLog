# FitLog Quick Context

> このファイルはエージェント起動時に最初に読む圧縮コンテキストです。
> 詳細は `docs/handoff.md` を参照。フェーズ切替時に必ず更新する。

## 現状スナップショット

- Phase: **7 完了**・PR #19 CI グリーン・レビュー待ち（2026-06-17）
- NextPhase: Phase 7-1（workout-posts レスポンス passwordHash 漏洩修正）
- Issue: #18（Phase 7 完了）
- Branch: `feature/issue-18-phase7-timeline-workout-post`（PR #19）
- Status: PR #19 CI グリーン・レビュー待ち

## 技術スタック

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS **v3**
- Backend: NestJS + TypeORM + PostgreSQL 17
- DB: PostgreSQL 17（docker-compose）※ LocalStack は Phase 9
- CI: GitHub Actions — Lint + 型チェック + Jest/Vitest（Node 22 強制）

## Phase 7 確定決定事項

| 項目 | 決定 |
|------|------|
| trainedOn 初期値 | ローカル日付（new Date() のローカルメソッド使用）。toISOString().slice(0,10) は UTC 基準のため不可 |
| フォロー中タブ | UI は表示、API 呼び出しなし・Phase 10 プレースホルダー表示 |
| 削除確認 | window.confirm 禁止。showDeleteConfirm state でインライン表示 |
| workout-posts user 関係 | passwordHash 漏洩あり → Phase 7-1 で修正 |
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

## NextAction

PR #19 レビュー承認 → マージ。
マージ後、Phase 7-1（passwordHash 漏洩修正）の Issue を発行して実装する。

## 参照ファイル（詳細確認が必要な場合）

- ルール: `CLAUDE.md`
- 全体フェーズ計画（Phase 1〜18）: `docs/phase-roadmap.md`
- 認証仕様: `docs/features/01_auth.md`
- DB 設計: `docs/database.md`
- 状態詳細: `docs/handoff.md`
- Issue: #18（Phase 7 完了）、#16（Phase 6 / 完了）、#14（Phase 5-1 / 完了）、#12（Phase 5 / 完了）
