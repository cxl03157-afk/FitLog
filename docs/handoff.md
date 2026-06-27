# Agent Handoff

## CurrentPhase
- **Phase 13-2**: 例外処理・Toast・ErrorBoundary・既知バグ修正・E2E 拡充（Issue #34 / Branch: `feature/issue-34-phase13-2-error-handling`）
  - 実装・検証・PR作成完了。PR #35 マージ待ち。
  - PR #35: OPEN / MERGEABLE / CI 全件 PASS / HEAD: `64fc693`
  - Issue #34: OPEN（PR #35 の `Closes #34` でリンク済み。マージ後に自動クローズ予定）
- **Phase 13-1 完了**: Personal Records CRUD UI（Issue #32 / PR #33 マージ済み 2026-06-26）
  - merge commit: `37c7bc0`
- **Phase 12 完了**: API仕様書・Swagger整備（Issue #30 / PR #31 マージ済み 2026-06-25）
- **Phase 11 完了**: 週間/月間集計・目標設定（Issue #28 / Branch: `feature/issue-28-phase11-stats-goals`）
  - Sub-phase 11-1〜11-5 すべて完了・コミット済み。PR #29 マージ済み（2026-06-24）。
- **Phase 10 完了**: フロントエンド フォロー・プロフィール・画像UI（Issue #26 / PR #27 マージ済み 2026-06-24）
- Phase 9 complete: S3 画像アップロード バックエンド + LocalStack（Issue #24）PR #25 マージ済み（2026-06-19）
- Phase 8 complete: フロントエンド コメント・ナイス機能（Issue #22）PR #23 マージ済み（2026-06-18）
- Phase 7-1 complete: workout-posts passwordHash 漏洩修正（Issue #20）PR #21 マージ済み（2026-06-17）
- Phase 7 complete: フロントエンド タイムライン・投稿機能（Issue #18）PR #19 マージ済み（2026-06-17）
- Phase 6 complete: フロントエンド基盤（Issue #16）PR #17 マージ済み（2026-06-17）
- Phase 5-1 complete: パーソナルレコード手動登録 API（Issue #14）PR #15 マージ済み（2026-06-12）
- Phase 5 complete: バックエンド API（Issue #12）PR #13 マージ済み（2026-06-11）
- Phase 4 complete: 認証API実装（Issue #8）PR #9 merged（2026-06-10）
- Phase 3 complete: PR #7 merged, Issue #6 closed
- Phase 2 complete: PR #4 merged, Issue #3 closed

## Status
- Issue #34: OPEN（PR #35 の `Closes #34` でリンク済み。マージ後に自動クローズ予定）
- PR #35: OPEN / MERGEABLE / CI 全件 PASS
- Issue #32: 完了・PR #33 マージ済み（2026-06-26）
- Issue #30: 完了・PR #31 マージ済み（2026-06-25）
- Issue #28: 完了・PR #29 マージ済み（2026-06-24）
- Issue #26 完了・PR #27 マージ済み（2026-06-24）
- Issue #24 完了・PR #25 マージ済み（2026-06-19）
- Issue #22 完了・PR #23 マージ済み（2026-06-18）
- Issue #20 完了・PR #21 マージ済み（2026-06-17）
- Issue #18 完了・PR #19 マージ済み（2026-06-17）
- Issue #16 完了・PR #17 マージ済み（2026-06-17）
- Issue #14 完了・PR #15 マージ済み（2026-06-12）
- Issue #12 完了・PR #13 マージ済み（2026-06-11）
- Issue #8 完了・PR #9 マージ済み（2026-06-10）
- Issue #10 完了・PR #11 マージ済み（2026-06-10）

## Phase13-2CommitHistory（次セッション引き継ぎ用）

| # | コミットハッシュ | 内容 |
|---|--------------|------|
| 1 | `2f776fb` | docs: sync Phase 13-1 completion and start Phase 13-2 |
| 2 | `adb85cf` | fix(workout-posts): initialize like state from loaded post data |
| 3 | `8eda87e` | fix(comments): prevent navigation while comment is submitting |
| 4 | `fef17d6` | feat(backend): add global exception filter |
| 5 | `f7687da` | feat(frontend): add shared toast context and provider |
| 6 | `5239534` | refactor(frontend): migrate PersonalRecordsPage to shared toast |
| 7 | `d88443a` | fix(workout-posts): map raw counts by post id |
| 8 | `36c1119` | fix(personal-records): require exercise and positive weight |
| 9 | `158e693` | fix(navigation): clarify new post action label |
| 10 | `8be846a` | feat(frontend): add error boundary |
| 11 | `e860803` | test(e2e): add phase13 scenario 3 |
| 12 | `fe469fd` | test(e2e): wait for following feed filter |
| 13 | `10a3d7e` | docs: complete phase 13-2 |
| 14 | `288016a` | docs: correct phase 13-2 scenario numbers |
| 15 | `64fc693` | test(frontend): suppress react 19 concurrent rendering error in ErrorBoundary tests |

## Phase13-2確定事項

| 項目 | 決定 |
|------|------|
| weightKg 最小値 | 0.01kg（0 を拒否。create / update 両方）。フロント: `Number() + Number.isFinite()` で厳密検証 |
| 既存 0kg レコード | 変更なし（読み取り・表示は可能。DB CHECK 制約未追加）。既存データ整理は将来判断 |
| 種目選択（新規） | 未選択（「種目を選択してください」）。明示選択が必須。API を呼ばない |
| 種目選択（編集） | 既存種目を表示・変更不可 |
| NavBar 投稿リンク | `新規投稿`（ナビゲーション用リンク）。投稿フォームの送信ボタンは `投稿する` のまま（役割が異なる） |
| AllExceptionsFilter | APP_FILTER で AppModule に登録。HttpException は body を透過（object body）または正規化（string body → `{statusCode, message}`）。非 HttpException は 500 + "Internal server error"。非 HttpException 時のみ logger.error |
| Provider 順序 | `BrowserRouter > ErrorBoundary > AuthProvider > ToastProvider > Routes` |
| ErrorBoundary 配置 | BrowserRouter 直下（Router context を使える位置）。FallbackUI は useNavigate でリセット＋/ 遷移 |
| ToastContext | showToast / hideToast / timerRef。5秒自動消去・unmount 時はタイマー解放のみ（setState しない）|
| E2E 待機方針 | `waitForResponse`・web-first assertion。固定 `waitForTimeout` 禁止 |

## Phase13-1CommitHistory（次セッション引き継ぎ用）

| # | コミットハッシュ | 内容 |
|---|--------------|------|
| 1 | `7b70d47` | fix+test: reject recordType change in update + service spec |
| 2 | `39bfaf5` | test: add personal-records integration spec (17 cases) |
| 3 | `6d95f1a` | feat: add personalRecord types, API client, route, NavBar link |
| 4 | `bb10dcd` | feat(personal-records): add CRUD page and navigation |
| 5 | `b73cb4a` | test(personal-records): add unit and E2E coverage |
| 6 | `8ff0a89` | docs: document Phase 13-1 implementation and verification |

## Phase13-1確定事項

| 項目 | 決定 |
|------|------|
| recordType 変更制限 | PUT で既存値と異なる recordType → 400 BadRequestException（同じ値・省略は許可） |
| exerciseId 変更 | UpdatePersonalRecordDto に存在しない。ValidationPipe (whitelist: true) が除去 |
| note 空欄時 | null を送信（削除）。bio 方式に統一 |
| 数値パース | `Number() + Number.isFinite()` 厳密検証 |
| 削除中の表示 | 「はい」押下後に行内確認を閉じ、元の「削除」ボタンを disabled（差異1・承認済み） |
| unit test 配置 | `frontend/src/test/PersonalRecordsPage.test.tsx`（差異2・既存規則に合わせた） |
| POST レスポンス | exercise リレーション含まない（PersonalRecordCreated 型） |
| GET / PUT レスポンス | exercise リレーション含む（PersonalRecord 型） |
| Swagger @ApiCreatedResponse | 「登録直後のレスポンスにはexerciseリレーションを含まない」に修正（Commit 6） |
| sourceExerciseSetId | 初期 UI 対象外（将来対応・別 Issue 候補） |

## Phase13-1差異一覧

| # | 当初計画 | 実際 | 判定 | 再確認タイミング |
|---|---------|------|------|----------------|
| 1 | 削除中: 行内確認を残したまま「はい」ボタンをdisabled | 「はい」押下直後に行内確認を閉じ、元の「削除」ボタンをdisabled | 二重削除防止の完了条件は満たしている。Phase 13-1内で承認済み | Phase 13-3の画面確認時に操作感を再確認 |
| 2 | Unit testファイル配置: `frontend/src/pages/PersonalRecordsPage.test.tsx` | `frontend/src/test/PersonalRecordsPage.test.tsx` | 既存テスト配置規則（`src/test/`）に合わせた結果として承認済み | — |

## Phase13-2への既知課題

以下2件は Phase 13-1 の Personal Records 変更による差異ではない。Phase 7〜8 実装時から存在する既存バグ。Phase 13-1 スコープ外のため Phase 13-2 で修正・テストを実施する。

### 既知バグ1：投稿詳細のナイス初期状態

**症状:**
- 投稿詳細ページで、API 上はナイス済み・likeCount が1以上でも、初期表示が未ナイス・0件になる

**原因:**
- `WorkoutPostDetailPage` で post 取得前に `useLikeToggle(id, false, 0)` が初期化される
- API 取得後に引数が変わっても `useState` の初期値は更新されない（React の仕様）

**Phase 13-2 対応:**
- 修正前に非同期取得前後を再現する失敗 unit test を追加
- post 取得後に正しい初期値で Like UI をマウントする案を優先検討
- Scenario 3 で初期 likeCount・初期ナイス済み状態・Unlike・Like を確認

**分類:** 既存バグ / Phase 13-1 スコープ外 / Phase 13-2 で修正・unit test・E2E を実施

### 既知バグ2：タイムラインのコメント数が古い

**症状:**
- 詳細ページでコメントを追加した後、タイムラインへ戻っても commentCount が更新されないことがある

**原因:**
- `TimelinePage` の `posts` state が初回取得時の commentCount を保持する
- 詳細ページでのコメント追加が Timeline state へ反映されない

**Phase 13-2 対応:**
- 修正前にコメント追加後の画面遷移を再現するテストを追加
- 手動リロードなしでタイムラインのコメント数を更新する
- Scenario 4 に「コメント後タイムラインへ戻り、件数が1増える」確認を追加

**分類:** 既存バグ / Phase 13-1 スコープ外 / Phase 13-2 で修正・unit test・E2E を実施

## Phase12CommitHistory（次セッション引き継ぎ用）

| コミットハッシュ | 内容 |
|--------------|------|
| `b18ed47` | docs: add personal_records table to docs/database.md |
| `fab1309` | feat: add Swagger decorators to all controllers and @ApiProperty to all DTOs |
| `8ad54e1` | docs: fix API path and userId type in 02_workout_post.md |
| `4b3344a` | fix: align Swagger responses with API behavior |
| `（本コミット）` | docs: update handoff and context for Phase 12 completion |

## Phase11CommitHistory（次セッション引き継ぎ用）

| Sub-phase | コミットハッシュ | 内容 |
|-----------|--------------|------|
| 11-1 | `b8475b7` | feat: implement sub-phase 11-1 stats and goal validation |
| 11-2 | `c31f650` | feat: add recharts and stats and goals API clients |
| 11-3 | `61c6253` | feat: implement StatsPage charts and exercise metrics |
| 11-4 | `0fbfc77` | feat: implement GoalsPage management and filter tabs |
| 11-5 | `02973ff` | test: add Phase 11 e2e coverage and finalize documentation |
| docs | `9f0e25d` | docs: finalize Phase 11 handoff before PR |
| fix  | `6ed09c7` | fix: remove useless escape in phase11 e2e spec |

## Phase10CommitHistory（次セッション引き継ぎ用）

| Sub-phase | コミットハッシュ | 内容 |
|-----------|--------------|------|
| 10-1 | `5e16ca3` | feat: implement Phase 10-1 backend user APIs |
| 10-2 | `2545afc` | feat: add frontend types and API clients for Phase 10 |
| 10-3 | `0418bbb` | feat: implement Phase 10-3 post image UI |
| 10-4 | `55422a5` | feat: implement Phase 10-4 profile and avatar UI |
| 10-5 | `690bd8c` | feat: implement Phase 10-5 follow and search UI |
| 10-6 | `cf6fb1f` | feat: implement Phase 10-6 session management UI |
| 10-7 | `f162009` | feat: implement Phase 10-7 NavBar avatar and Playwright E2E |
| docs | `5f19d8d` | docs: prepare Phase 10 for review |
| fix  | `dbce453` | test: fix QueryBuilder mock types in backend specs |

## UncommittedChanges

`.claude/settings.json` のみ未コミット（今後もいかなるコミットにも含めない）。PR #31 の差分にも含まれていないことを全4コミットの変更ファイルで確認済み。
次セッション開始時は最初に `git status --short` を実行して作業ツリーを確認すること。

## NextActions

1. PR #35 マージ（ユーザー承認後）→ Issue #34 自動クローズ確認
2. main へ切り替え（`git checkout main && git pull`）
3. Phase 13-2.1 Issue 作成（未採番）→ 新規ブランチ作成
4. Phase 13-2.1 実装開始（NavBar 導線追加）

## NextPhase

- **Phase 13-2.1**: NavBarに検索・統計・目標管理への導線追加（Issue 未作成・未採番）
- その後: 13-3（種目マスタ）→ 13-4 → 13-4.1 → 13-5 → 13-6 → 13-7 → 13-7.1 → 13-8（旧Phase 13-3 レスポンシブ移設）

## TestResults（Phase 13-2 完了時点 / Commit 13）

### Backend
| チェック | 結果 |
|---------|------|
| lint | PASS |
| unit test | PASS（17 suites / **172 tests**） |
| integration test | PASS（4 suites / **42 tests**） |
| build | PASS |

### Frontend
| チェック | 結果 |
|---------|------|
| lint | PASS |
| unit test | PASS（20 files / **289 tests**） |
| build | PASS（Recharts バンドル警告あり・gzip 215 kB 程度） |
| E2E（Playwright） | PASS（**14件 × 3回連続**: phase10×6 + phase11×4 + phase13×4） |

## TestResults（Phase 13-1 Commit 5 完了時点）

### Backend
| チェック | 結果 |
|---------|------|
| lint | PASS |
| unit test | PASS（16 suites / **150 tests**） |
| integration test | PASS（4 suites / **38 tests**） |
| build | PASS |

### Frontend
| チェック | 結果 |
|---------|------|
| lint | PASS |
| unit test | PASS（17 files / **240 tests**） |
| build | PASS（バンドル警告あり: Recharts 736 kB / gzip 217 kB） |
| E2E（Playwright） | PASS（**12件**: phase10×6 + phase11×4 + phase13×2） |

## TestResults（Phase 12 完了時点）

| チェック | 結果 |
|---------|------|
| Backend lint | PASS |
| Backend unit test | PASS（16 suites / 147 tests） |
| Backend integration test | PASS（3 suites / 21 tests） |
| Backend build | PASS |
| Frontend | 変更なし（スコープ外） |
| Swagger UI / OpenAPI JSON | 全実装ルート確認済み。5箇所（201/404/409/400/number schema）を OpenAPI JSON で検証済み |
| /code-review 再実施 | 新規問題なし |

## CIResults（PR #31 / 2026-06-24）

| ジョブ | 結果 | 所要時間 |
|-------|------|---------|
| Lint, Type Check & Test | PASS | 1m16s |

## TestResults（Sub-phase 11-5 完了時点）

| チェック | 結果 |
|---------|------|
| Backend lint | PASS |
| Backend unit test | PASS（16 suites / 147 tests） |
| Backend integration test | PASS（3 suites / 21 tests） |
| Backend build | PASS |
| Frontend lint | PASS |
| Frontend unit test | PASS（16 files / 211 tests）|
| Frontend build | PASS（バンドル警告あり ※後述） |

### Frontend build 警告（Recharts バンドルサイズ）

```
(!) Some chunks are larger than 500 kB after minification.
dist/assets/index.js: 724.64 kB (gzip: 215.32 kB)
```

- Recharts の SVG 描画エンジンを含むため 724 kB（非圧縮）/ 215 kB（gzip）になる。
- gzip 後 215 kB はブラウザの通常転送サイズとして許容範囲（目安: 300 kB 未満）。
- 将来のバンドル最適化候補（特定 Phase に未割当）: Recharts の dynamic import または tree-shaking が有効。
- 今回は対応不要と判断。

### Playwright E2E 確認（Sub-phase 11-5、4シナリオ PASS / 2026-06-24）

| # | 確認項目 | 結果 | 方法 |
|---|---------|------|------|
| 1 | StatsPage: 週間タブがデフォルト選択 | PASS | Playwright |
| 2 | StatsPage: 月間タブへ切り替え | PASS | Playwright |
| 3 | StatsPage: 一部0の期間でもグラフ表示 | PASS | Playwright |
| 4 | StatsPage: 全期間0のユーザーで空状態メッセージ | PASS | Playwright（新規ユーザーで確認） |
| 5 | StatsPage: 加重種目で「最大重量の推移」表示 | PASS | Playwright |
| 6 | StatsPage: 自重種目で「最大回数の推移」表示 | PASS | Playwright（2種目以上ある場合） |
| 7 | StatsPage: 記録なし種目で専用メッセージ | PASS | Playwright |
| 8 | StatsPage: APIエラー時のエラー表示 | 未実施 | Vitest unit test でカバー済み |
| 9 | GoalsPage: 目標を作成できる | PASS | Playwright |
| 10 | GoalsPage: 重量のみ/回数のみ/両方の目標作成 | PASS | Playwright |
| 11 | GoalsPage: 重量・回数両方未入力でエラー | PASS | Playwright |
| 12 | GoalsPage: 過去日の期限でエラー | PASS | Playwright |
| 13 | GoalsPage: フィルタタブ絞り込み | PASS | Playwright |
| 14 | GoalsPage: 達成に変更 | PASS | Playwright |
| 15 | GoalsPage: 放棄 | PASS | Playwright |
| 16 | GoalsPage: 放棄確認キャンセル | PASS | Playwright |
| 17 | GoalsPage: 削除 | PASS | Playwright |
| 18 | GoalsPage: 削除確認キャンセル | PASS | Playwright |
| 19 | GoalsPage: API処理中の二重送信防止 | 未実施 | Vitest unit test でカバー済み（disabled state 検証） |
| 20 | GoalsPage: API失敗時の状態維持 | 未実施 | Vitest unit test でカバー済み（cardErrors・modalError 検証） |

### テストデータ後処理

Playwright テストは各シナリオで専用 E2E ユーザーを作成。ユーザーおよびデータはテスト完了後も DB に残存するが、すべて E2E 専用アカウントのため本番影響なし。

## CIResults（PR #29 / 2026-06-24）

### 初回 push 後 CI（失敗）

- `frontend/e2e/phase11.spec.ts` 90行目で `no-useless-escape` エラー（ESLint）
- 末尾の `\"` を `"` へ修正してコミット `6ed09c7`（`fix: remove useless escape in phase11 e2e spec`）

### 再実行 CI（全 PASS）

| ジョブ | 結果 | 所要時間 |
|-------|------|---------|
| Lint, Type Check & Test (1) | PASS | 44s |
| Lint, Type Check & Test (2) | PASS | 41s |
| Lint, Type Check & Test (3) | PASS | 1m13s |

PR #29 はマージ可能状態（2026-06-24 確認済み）。

## TestResults（Sub-phase 10-6 完了時点）

| チェック | 結果 |
|---------|------|
| Frontend lint | PASS |
| tsc --noEmit | PASS |
| unit test | PASS（133 / 133）— SessionsPage 20・NavBar 3・LoginPage 6・AuthContext 6・other 98 |
| build | PASS |
| Playwright 10-6 スポット確認（7項目） | PASS（2026-06-24） |
| Backend unit/integration test | 前回（10-1）以降変更なし・PASS 維持 |

### Playwright 10-6 スポット確認項目（7 / 7 PASS）
1. 2つのセッションを別コンテキストで作成できた
2. SessionsPage に複数セッションが表示される
3. 「現在の端末」バッジが正確に1件表示される
4. 他端末を個別ログアウト → その行だけ消える
5. 個別ログアウト後、現在端末が残る
6. 「この端末を除く全端末をログアウト」で他端末のみ消える
7. 現在端末ログアウト → /login へ遷移する

### 未実施の Playwright 確認
- Sub-phase 10-7 の Playwright 自動 E2E テスト（6シナリオ）は未実施。
  計画ファイル（`/Users/user/.claude/plans/happy-beaming-cat.md`）の Sub-phase 10-7 参照。
  6シナリオ: 画像付き投稿・プロフィール更新・アバター更新・フォロー中タイムライン・ユーザー検索遷移・別セッション削除。

## ApprovalStatus

| 操作 | 状態 | 備考 |
|------|------|------|
| Sub-phase 10-1〜10-7 コミット | **承認済み・実施済み** | f162009・5f19d8d・dbce453 を含む全コミット完了 |
| push | **承認済み・実施済み** | origin/feature/issue-26-phase10-frontend へ push 済み |
| PR 作成 | **承認済み・実施済み** | PR #27 オープン中 |
| 完了ドキュメント追加 push | **コミット待ち** | コミット9（本ファイル含む3ファイル）承認後に push |
| マージ | **未承認・未実施** | CI 再確認・ユーザー最終承認後にマージ |

## SourceOfTruthOrder
1. `CLAUDE.md` (workflow and guardrails)
2. `docs/要件定義書.md` (product scope and non-functional requirements)
3. `docs/features.md` + `docs/features/*.md` (use cases and API contracts)
4. `docs/screens.md` (UI and navigation behavior)
5. `docs/database.md` (ER and data constraints)
6. This file `docs/handoff.md` (execution state and next action)

## ResponsibilitySplit
- Issue: objective, definition of done, deliverables
- PR: implementation delta, validation evidence, `Closes #...`
- `docs/handoff.md`: current state, decisions, open questions, next action

## Decisions
- Multi-device auth is adopted (session-scoped refresh token lifecycle).
- Session management API (`/api/auth/sessions`) is in scope.
- Replay detection via `replaced_by_token_id` is required.
- Security controls include Origin/Referer check, rate limit, audit logging.
- Phase 2 mock is plain static files under `mock/` (HTML/CSS/JS + Tailwind CDN).
- Follow list UI is one screen with tab switch; routes remain two (`/followers`, `/following`).
- Phase 2 mock fidelity is fixed to desktop-first (mobile optimization is deferred).
- Handoff operation must verify that the prompt Issue number and `docs/handoff.md` References Issue are identical before execution.
- Mock state is persisted in `sessionStorage` (`fitlog_mock_v4`); reset via `login.html?reset=1`.
- Follow state uses `followingIds` array (not a map); unfollow shows a confirmation dialog.
- Timeline shows a compact follow button on others' posts only (no separate "フォロー中" label beside the name).
- Goal abandon action label is 「中止する」; delete and abort both require confirmation dialogs.
- Mock auth stores registered users in `registeredUsers` / `accounts`; register requires password confirmation.
- [Phase 3] `docker-compose.yml` は PostgreSQL 17 のみ。LocalStack は Phase 9 で追加する。
- [Phase 3] CI 完了条件は Lint + 型チェック + テスト（Jest/Vitest）まで含む。
- [Phase 3] Node 22 は CI で強制する（`actions/setup-node@v4` + `.nvmrc`）。
- [Phase 3] Tailwind CSS は v3（`tailwind.config.js` + `postcss.config.js`）で導入する。
- [Phase 4] Cookie: HttpOnly, SameSite=Strict, Path=/api/auth; Secure は NODE_ENV で切り替え。
- [Phase 4] DELETE /api/auth/sessions は現在端末を除く全セッションを無効化。
- [Phase 4] レート制限: login 10回/分、refresh 20回/分（IP + email）。
- [Phase 4] トークン削除保持期間: revoked_at / expires_at から 30 日後。
- [Phase 4] 監査ログ: NestJS Logger JSON 形式。機微情報マスキング必須。
- [Phase 5] exercises.controller: GET /api/exercises は認証必須（仕様書 UC-xx に基づき @UseGuards(JwtAuthGuard) 適用）。
- [Phase 5] DECIMAL 列（weight_kg 等）は pg ドライバーが string を返す → TypeORM transformer で parseFloat。
- [Phase 5] repository.update() は @UpdateDateColumn を発火しない → updatedAt: new Date() を明示。
- [Phase 5-1] personal_records テーブルを新設（exercise_sets の is_pr フラグとは独立した CRUD）。source_exercise_set_id は nullable FK で元セットとの紐付けは任意。
- [Phase 6] User 型は `{ id, username, displayName, email }` の4フィールド。avatarUrl / bio は login/refresh レスポンス非含有のため Phase 10 で追加。
- [Phase 6] Axios interceptor: `/api/auth/refresh` 自体への 401 はリトライしない（originalRequest.url チェックで除外）。_retry フラグで同一リクエストの二重リトライも防止。
- [Phase 6] フロントエンド CI に Build ステップ追加（tsc -b + vite build）。
- [Phase 6] .env.local が必須（VITE_API_BASE_URL）。新規クローン時は `cp .env.example .env.local`。README に手順追記済み。
- [Phase 7] trainedOn はローカル日付で初期化（toISOString().slice(0,10) は UTC 基準のため不可）。
- [Phase 7] フォロー中タブは UI のみ表示。API 呼び出しは Phase 10 まで行わない。
- [Phase 7] 削除確認は window.confirm 禁止。showDeleteConfirm state でインライン表示。
- [Phase 7] workout-posts の user リレーションが passwordHash を含む → Phase 7-1 で修正済み。
- [Phase 7] dataSource.transaction(manager) 内で this.xxxRepository を呼ぶと別コネクションが使われ未コミットデータが見えない。createdId をコールバック外に持ち出してコミット後に findOne() を呼ぶ。
- [Phase 7-1] User.passwordHash に @Exclude() + WorkoutPostsController に @UseInterceptors(ClassSerializerInterceptor) を適用。グローバル適用は他エンドポイントへの影響リスクのため回避。
- [Phase 7-1] @Exclude() は class インスタンス（Object.assign(new User(), {...})）でのみ機能。plain object では除外されない。
- [Phase 7-1] Controller + supertest テストを追加（74件 pass）。ClassSerializerInterceptor は HTTP パイプライン経由でのみ動作するため、Controller メソッド直接呼び出しでは検証不可。
- [Phase 8] likeCount / commentCount / isLiked を GET /api/workout-posts・GET /api/workout-posts/:id レスポンスに追加（サブクエリ方式）。
- [Phase 8] CommentsController に @UseInterceptors(ClassSerializerInterceptor) を適用。createComment も user リレーション込みで返す。
- [Phase 8] createComment: save 後に findOneOrFail({ relations: { user: true } }) で再取得（user 未ロード → c.user.displayName TypeError を防止）。
- [Phase 8] コメント文字数上限 280 文字（@MaxLength(280)）。フロント・バック統一。
- [Phase 8] ナイストグル 409 Conflict: isLiked=true に寄せ likeCount は prevCount に戻す（楽観的更新の二重加算防止）。
- [Phase 8] PostCard を <article> 構造に変更。ナイスボタンは <Link> 外に配置（リンク内ボタンの UX 問題回避）。
- [Phase 8] Playwright クラス判定で includes('orange') 禁止。hover:text-orange-400 も一致するため includes('text-orange-500') または data-testid を使う。
- [Phase 8] 統合テスト型アサーション: TypeScript が直接 as T を拒否する場合は as unknown as T の二段アサーションに変更。
- [Phase 9] S3 モジュールは @Global() 不使用。WorkoutPostsModule / UsersModule で明示的にインポート（依存関係の可視化）。
- [Phase 9] Multer は memoryStorage。fileFilter で image/jpeg・png・webp のみ許可、limits.fileSize 10MB。
- [Phase 9] S3 key: `images/posts/{postId}/{uuid}.{ext}` / `images/avatars/{userId}/{uuid}.{ext}`。URL は IMAGE_BASE_URL + key で生成（DB に URL を保存しない）。
- [Phase 9] AWS_S3_ENDPOINT が未設定なら実 AWS S3 へ接続。LocalStack は endpoint + forcePathStyle=true で切り替え。
- [Phase 9] uploadImages エラー: アップロード済みキーを deleteMany でロールバック。rollback 失敗はログのみ、元例外を再 throw。remove() の S3 削除失敗もログのみ、DB 削除は継続。
- [Phase 9] TypeORM FindOptionsSelect は配列形式不可（TS2559）→ `{ field: true }` のオブジェクト形式が必須。
- [Phase 9] 統合テストのユーザー名は DB の 20文字上限に注意（`av_${Date.now()}` = 16文字で適合）。
- [Phase 10 / 10-1] `GET /api/users/:id`（プロフィール取得）・`GET /api/users/search`（ユーザー検索）・`PATCH /api/users/me/profile`（プロフィール更新）の 3 エンドポイントを UsersController / UsersService に追加。
- [Phase 10 / 10-1] GET /api/users/:id: postCount / followerCount / followingCount を EXISTS サブクエリで一括取得。avatarUrl は `IMAGE_BASE_URL + "/" + avatarKey`（null なら null）。自分自身は isFollowing=false。存在しないユーザーは 404。
- [Phase 10 / 10-1] GET /api/users/search バリデーション: `@IsString @Transform(trim) @Matches(/\S/) @MaxLength(20)` / limit: `@Type(Number) @IsInt @Min(1) @Max(50) default=20`。trim 後の ILIKE 検索。2文字未満制限はフロントエンドのみ。
- [Phase 10 / 10-1] PATCH /api/users/me/profile: `displayName` は trim 後 MinLength(1)（空白のみ→400）。`bio` は空文字・trim後空文字→null 変換。空 DTO は no-op。未知フィールドは 400（forbidNonWhitelisted）。
- [Phase 10 / 10-1] getFollowers / getFollowing: 旧 `Follow[]` 返却から `FollowUserDto[]` に変更。QueryBuilder + EXISTS サブクエリで isFollowing を一括取得（N+1 回避）。avatarUrl を含む。存在しないユーザーは 404（usersService.findById が throw）。存在するユーザーでフォロワーなしは 200 + 空配列。
- [Phase 10 / 10-1] テスト結果: lint PASS / unit 114 PASS / build PASS / integration 21 PASS（2026-06-23）。
- [Phase 10 / 10-2] `types/auth.ts`: `AuthUser`（auth API が返す基本4フィールド）を分離し、`User = AuthUser & { avatarUrl: string|null, bio: string|null }` に拡張。`AuthResponse.user` は `AuthUser` 型。
- [Phase 10 / 10-2] `types/workout.ts`: `PostImageItem = { id, imageKey, displayOrder, imageUrl }` 追加。`WorkoutPost.postImages: PostImageItem[]` 追加。
- [Phase 10 / 10-2] `types/user.ts`（新規）: `UserProfile`・`SearchUser`・`FollowUser` 型定義。
- [Phase 10 / 10-2] `api/workoutPosts.ts`: `FetchWorkoutPostsParams` に `feed?: 'all' | 'following'`・`userId?: string` 追加。
- [Phase 10 / 10-2] `api/users.ts`（新規）: `getProfile`・`searchUsers`・`updateProfile`・`uploadAvatar`。
- [Phase 10 / 10-2] `api/follows.ts`（新規）: `followUser`・`unfollowUser`・`getFollowers`・`getFollowing`。
- [Phase 10 / 10-2] `api/sessions.ts`（新規）: `SessionInfo`・`getSessions`・`revokeSession`・`revokeAllOtherSessions`。
- [Phase 10 / 10-2] `AuthContext`: login/register 直後に `avatarUrl: null, bio: null` でセット後、非同期で `getProfile` を呼びプロフィール補完。`updateCurrentUser` を context に公開（外部コンポーネントから部分更新可能）。補完失敗: 401 のみ認証クリア、それ以外はコンソールエラーのみでログイン維持。`setUser` 関数形式で更新するため stale closure の上書きは発生しない。
- [Phase 10 / 10-2] テスト結果: lint PASS / unit 28 PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-3] 投稿画像 UI 実装。画像は最大4枚・JPEG/PNG/WebP・各10MB以下。0バイト・重複ファイル（名前+サイズ+lastModified が同一）は選択時に除外。一部不正ファイルがあっても有効ファイルは保持して送信続行。Object URL は削除時に対象のみ個別 revoke、アンマウント時は `selectedImagesRef` 経由で全残存 URL を一括解放（stale closure 回避）。
- [Phase 10 / 10-3] 投稿後に POST /:id/images が失敗した場合も投稿 DB は維持。タイムラインへ遷移してトースト「投稿は保存されましたが、画像のアップロードに失敗しました」を表示（5秒後自動消去）。再試行 UI は Phase 10 スコープ外。
- [Phase 10 / 10-3] PostCard・WorkoutPostDetailPage に postImages グリッド表示追加（1枚: grid-cols-1、2-4枚: grid-cols-2）。TimelinePage は `useLocation().state.toast` でトーストを表示。
- [Phase 10 / 10-3] テスト結果: lint PASS / unit 44 PASS（+16件）/ tsc PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-4] ProfilePage（`pages/stubs/ProfilePage.tsx`）を完全実装。ローディング・404・エラー・正常の4状態対応。
- [Phase 10 / 10-4] アバター表示: `avatarUrl` あり → `<img>`、なし → 表示名イニシャル円（取得不可時は `?`）。
- [Phase 10 / 10-4] 自分のプロフィール: 「プロフィールを編集」ボタン → インラインモーダル（表示名・bio）+ アバター変更ボタン（モーダル内）。他ユーザー: フォロー/フォロー中ボタン。
- [Phase 10 / 10-4] フォロー操作: API 成功時のみ followerCount ±1。409（既フォロー）→ isFollowing=true に寄せるが件数は変化しない。404 on unfollow → isFollowing=false に寄せるが件数は変化しない。
- [Phase 10 / 10-4] アバター更新成功: `uploadAvatar` → `updateCurrentUser({ avatarUrl })` で NavBar 即時反映。失敗: モーダル内エラー表示・既存アバター維持。
- [Phase 10 / 10-4] `useEffect` の setState を同期的に effect 本体で呼ぶ代わりに cleanup 関数でリセット（`react-hooks/set-state-in-effect` lint エラー回避）。`cancelled` フラグで旧フェッチのレース防止。
- [Phase 10 / 10-4] アバター input.value は `handleAvatarSelect` 冒頭で同期的に `= ''` リセット（同一ファイルの再選択対応）。
- [Phase 10 / 10-4] テスト結果: lint PASS / unit 68 PASS（23 ProfilePage + 5 AuthContext + 40 other）/ tsc PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-4] Playwright スポット確認（13項目 PASS / 2026-06-23）: 自分のプロフィール表示（イニシャル・統計・編集ボタン）・表示名 bio 編集の画面反映・アバターアップロード後の &lt;img&gt; 切り替えと NavBar 即時反映・他ユーザープロフィール（フォローボタン）・フォロー→followerCount+1・フォロー解除→followerCount-1・フォロワー/フォロー中リンク先 URL・投稿一覧/0件表示。
- [Phase 10 / 10-5] UserCard（`components/UserCard.tsx`）新規作成。アバター（avatarUrl あり → img / なし → イニシャル円、取得不可時は `?`）・表示名・`@username`・フォローボタン（自分自身には非表示）。カード全体が `/users/:id` リンク。フォローボタンはリンク外に配置（クリックでプロフィール遷移しない）。エラーメッセージは3秒後に自動消去（useEffect cleanup でタイマーをクリア）。フォロー API 成功まで isFollowing を変更しない（非楽観的更新）。409 → isFollowing=true に寄せる / 404 → isFollowing=false に寄せる / その他 → 元の状態を維持しエラーメッセージ表示。
- [Phase 10 / 10-5] FollowersPage / FollowingPage（スタブ→実装）。getFollowers / getFollowing を呼び UserCard で一覧表示。0件・404・その他 API エラーをそれぞれ表示。タブ切替は Link（`/users/:id/followers` ↔ `/users/:id/following`）。useEffect cleanup で cancelled フラグ + setState リセット（react-hooks/set-state-in-effect 対応）。
- [Phase 10 / 10-5] SearchPage（スタブ→実装）。入力 300ms デバウンス + AbortController（新しいリクエスト開始時に旧リクエストを abort）。trim 後 2文字以上の場合のみ `GET /api/users/search` を呼ぶ。2文字未満に戻した際はデバウンスタイマーをキャンセルし controller.abort() + 結果・エラー・ローディングをすべてクリア。キャンセルされたリクエストではエラー表示しない（cancelled フラグで判定）。自分自身の結果にフォローボタン非表示（UserCard の isSelf チェック）。`api/users.ts` の `searchUsers` に AbortSignal パラメータを追加。
- [Phase 10 / 10-5] TimelinePage フォロー中タブ有効化。useEffect の依存配列を `[activeTab]` に変更し `feed: activeTab` でフェッチ。タブ切替時に cleanup（cancelled=true + 各 state リセット）→ 旧リクエスト結果が新しいタブを上書きしない。handleLoadMore も `activeTab` を参照するため二重呼び出しなし。フォロー中 0件時は「フォロー中のユーザーの投稿はありません。」を表示。
- [Phase 10 / 10-5] テスト結果: lint PASS / unit 107 PASS（12 UserCard + 11 FollowersPage/FollowingPage + 10 SearchPage + 10 TimelinePage + 23 ProfilePage + 16 WorkoutPostNewPage + 25 other）/ tsc PASS / build PASS（2026-06-23）。
- [Phase 10 / 10-5] Playwright スポット確認（11項目 PASS / 2026-06-23）: フォロワー0件表示・フォロー中0件表示・ユーザー検索（e2espot2 表示）・自分自身にフォローボタンなし・検索結果からプロフィール遷移・フォロー成功（ボタン「フォロー中」）・フォロワー一覧に e2espot1 表示・フォロー中一覧に e2espot2 表示・フォロー中タイムラインに投稿表示・フォロー解除成功・フォロー解除後タイムラインから消える。
- [Phase 10 / 10-6] SessionsPage（`pages/stubs/SessionsPage.tsx`）を完全実装。スピナー・取得失敗・0件・一覧の4状態対応。
- [Phase 10 / 10-6] `isCurrent=true` の行に「現在の端末」バッジ。各行にログアウトボタン。全他端末ログアウトボタン（他端末がある場合のみ表示）。
- [Phase 10 / 10-6] 現在端末ログアウト: `AuthContext.logout()` を呼ぶ → 成功/失敗を問わず `/login` へ遷移。失敗時は `navigate('/login', { state: { logoutError } })` でエラーを渡し LoginPage で表示。
- [Phase 10 / 10-6] 他端末ログアウト: `revokeSession` 成功 → 対象行をリストから削除。失敗 → トーストエラー表示（5秒後自動消去）。処理中は対象ボタンのみ disabled・二重実行防止。
- [Phase 10 / 10-6] 全他端末ログアウト: `revokeAllOtherSessions` 成功 → `getSessions` 再取得。再取得失敗時は `refetch-error` 警告メッセージ（永続表示）＋「再読み込み」ボタンで再試行。既存一覧は加工しない。
- [Phase 10 / 10-6] `AuthContext.logout()` を try/finally に変更: API 失敗時でも `setAccessToken(null)` / `setUser(null)` を必ず実行し、エラーを re-throw。
- [Phase 10 / 10-6] `NavBar.handleLogout` を try/catch に変更: logout 失敗時も `/login` へ遷移・未処理 Promise rejection を防止。失敗時は `logoutError` を navigate state で渡す。
- [Phase 10 / 10-6] `LoginPage` に `location.state.logoutError` 読み取りを追加: ログアウト失敗エラーを遷移後にオレンジ色のバナーで表示。
- [Phase 10 / 10-6] `docs/features/01_auth.md` に `GET /api/auth/sessions` レスポンスフィールド仕様・logout 失敗時のフロントエンド動作（auth 常にクリア・Cookie 残存可能性・再認証の可能性・エラー表示方式）を追記。
- [Phase 10 / 10-6] テスト結果: lint PASS / unit 133 PASS（20 SessionsPage + 3 NavBar + 6 LoginPage + 6 AuthContext + 98 other）/ tsc PASS / build PASS（2026-06-23）。

- [Phase 11 / 11-1] 週間・月間集計はバックエンドが 12 期間固定配列を生成して返す（0補完あり）。週は月曜始まり（`DATE_TRUNC('week', ...)`）、period は `YYYY-MM-DD` / `YYYY-MM` 形式。データなし期間は `{ period, postCount: 0, totalVolume: 0 }`。
- [Phase 11 / 11-1] 種目別集計は metric 自動切り替え: `weight_kg > 0` の記録があれば `metric: 'weight'`、なければ `reps >= 1` で `metric: 'reps'`、どちらもなければ `metric: 'none'`。DB は pg ドライバーが decimal を文字列で返す可能性があるため `Number()` で必ず明示変換する。
- [Phase 11 / 11-1] 自重記録（weight_kg=0）と加重記録（weight_kg>0）が混在する場合: `metric: 'weight'` を優先。加重記録がある日のみ `records` に含め、自重のみの日は除外する。
- [Phase 11 / 11-1] `limit` パラメータは「直近トレーニング日数」（`trained_on` の DISTINCT 日付で最新 N 日）。セット数・投稿数ではない。範囲: 1〜90、デフォルト 30。
- [Phase 11 / 11-1] 目標期限（deadline）のバリデーションは JST 基準。`Date.now() + 9 * 3600 * 1000` でオフセット加算後 ISO スライスで `YYYY-MM-DD` を取得。`new Date('YYYY-MM-DD')` の UTC 解釈（0時のずれ）を回避。バックエンドの `getJstToday()` を `src/common/utils/date.util.ts` に切り出してテストで `jest.mock` 可能にする。
- [Phase 11 / 11-1] `create()` 相関バリデーション: `targetWeightKg == null && targetReps == null` → `BadRequestException`。DTO バリデーション: `targetWeightKg` は `@Min(0.01) @Max(1000)`、`targetReps` は `@Min(1) @Max(10000)`。
- [Phase 11 / 11-1] `update()` でも `dto.deadline` が指定された場合は JST 過去日チェックを実施。
- [Phase 11 / 11-1] 既知ドキュメント差異: `docs/database.md` に Phase 5-1 で追加済みの `personal_records` テーブルが未記載。Phase 11 ではスコープ外のため修正しない。Phase 12 開始時の doc-sync ゲートで既存 Entity・Migration と `docs/database.md` を照合し、カラム・型・主キー/外部キー・制約・リレーション・削除動作を追記する。必要に応じて `docs/features/08_personal_record.md` との整合も確認する。Phase 12 の Issue 本文と完了条件にもこの doc-sync 対応を明記する。

## OpenQuestions
- (none)

## ReviewStatus
- Phase 13-2: PR #35 OPEN / MERGEABLE / CI PASS / マージ待ち（2026-06-27）
- Phase 13-1: PR #33 マージ済み（2026-06-26）
- Phase 12: PR #31 マージ済み（2026-06-25）
- Phase 11: PR #29 マージ済み（2026-06-24）
- Phase 10: PR #27 マージ済み（2026-06-24）
- Phase 9: PR #25 マージ済み（2026-06-19）

## MergeReadiness
- Phase 13-2: PR #35 OPEN・CI 全件 PASS・MERGEABLE。ユーザー承認後にマージ可能。

## NextAction
1. push 承認取得 → `git push origin feature/issue-34-phase13-2-error-handling`
2. PR 作成（`Closes #34` 記載）
3. CI グリーン確認
4. レビュー → main マージ → Issue #34 自動クローズ確認
5. `git checkout main && git pull` でローカルを最新化

## References
- Plan（全体）: `docs/phase-roadmap.md`
- Issue: #34（Phase 13-2 / PR #35 マージ待ち）、#32（Phase 13-1 / 完了）、#30（Phase 12 / 完了）
- PR: #35（Phase 13-2 / OPEN・マージ待ち）、#33（Phase 13-1 / マージ済み）、#31（Phase 12 / マージ済み）、#29（Phase 11 / マージ済み）
- Branch: `feature/issue-34-phase13-2-error-handling`（Phase 13-2 / PR #35 マージ待ち）
- Repository: `https://github.com/cxl03157-afk/FitLog`

## UpdateRules
- Update this file at phase start, after every major decision, and at phase end.
- Keep `NextAction` as one concrete executable step.
- Never leave `OpenQuestions` stale after a decision is made.
- Keep `ReviewStatus` and `MergeReadiness` updated from PR creation to merge.

## PilotFeedback
- Phase 2 多エージェント運用の知見（Issue #10 で運用廃止済み）:
  - Codex/Composer へのコンテキスト引き渡しコストが高く、Claude Code 単独で完結できることが判明
  - docs/handoff.md をコード PR に混在させると CI が余分に起動する（コードと別 PR で管理すること）
