# 機能定義書：認証・アカウント機能

## 1. 業務フロー

### 1-1. 新規登録フロー
```
ユーザーがアプリにアクセス
    │
新規登録画面を表示
    │
ユーザー情報を入力（ユーザー名・表示名・メールアドレス・パスワード）
    │
「登録する」ボタンをクリック
    │
    ├── バリデーションエラー → エラーメッセージを表示（入力画面に留まる）
    │
    └── バリデーション成功
            │
        DB にユーザーを保存（パスワードは bcrypt でハッシュ化）
            │
        AccessToken（15分）+ RefreshToken（7日）を発行
            │
        RefreshToken を SHA-256 ハッシュ化して DB に保存
            │
        RefreshToken を httpOnly Cookie にセット
            │
        AccessToken をレスポンス JSON で返す
            │
        タイムライン画面へ遷移
```

### 1-2. ログインフロー
```
ユーザーがログイン画面を表示
    │
メールアドレス・パスワードを入力
    │
「ログイン」ボタンをクリック
    │
    ├── 認証失敗 → 「メールアドレスまたはパスワードが正しくありません」を表示
    │
    └── 認証成功
            │
        AccessToken（15分）+ RefreshToken（7日）を発行
            │
        RefreshToken は DB に token_hash（SHA-256）で保存
            │
        RefreshToken は httpOnly Cookie にセット
            │
        AccessToken をレスポンス JSON で返す
            │
        タイムライン画面へ遷移
```

### 1-3. AccessToken リフレッシュフロー（自動）
```
フロントエンドが API リクエスト送信
    │
バックエンドが 401 を返す（AccessToken 期限切れ）
    │
Axios インターセプターが 401 を検知
    │
POST /api/auth/refresh を実行（Cookie の RefreshToken を送信）
    │
    ├── RefreshToken 無効 → ログイン画面へリダイレクト
    │
    └── RefreshToken 有効
            │
        旧 RefreshToken を DB で revoked_at にマーク（ローテーション）
            │
        新 AccessToken + 新 RefreshToken を発行
            │
        新 RefreshToken を httpOnly Cookie に上書き
            │
        新 AccessToken で元のリクエストをリトライ
```

### 1-4. ログアウトフロー
```
ナビゲーションバーの「ログアウト」をクリック
    │
POST /api/auth/logout を実行
    │
バックエンドで DB の RefreshToken を revoked_at にマーク
    │
バックエンドで Cookie を削除（Max-Age=0）
    │
フロントエンドの AccessToken（メモリ）をクリア
    │
ログイン画面へ遷移
```

### 1-5. セッション管理フロー（端末管理）
```
プロフィール画面から「デバイス管理」を開く
    │
GET /api/auth/sessions を実行
    │
ログイン中セッション一覧を表示（端末名・最終利用時刻・IP・現在端末）
    │
    ├── 指定端末のみログアウト
    │       │
    │   DELETE /api/auth/sessions/:sessionId を実行
    │       │
    │   対象セッションの RefreshToken を revoked_at で無効化
    │
    └── 全端末ログアウト
            │
        DELETE /api/auth/sessions を実行
            │
        現在端末を除く全セッションを無効化（必要に応じ現在端末も失効）
```

**GET /api/auth/sessions レスポンスフィールド**:

```json
[
  {
    "sessionId": "uuid",
    "deviceName": "My Mac" | null,
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "lastUsedAt": "2026-06-23T10:00:00.000Z",
    "isCurrent": true
  }
]
```

| フィールド | 型 | 説明 |
|---|---|---|
| `sessionId` | `string` | セッション UUID |
| `deviceName` | `string \| null` | 登録済み端末名（未設定なら null） |
| `userAgent` | `string` | User-Agent 文字列 |
| `ipAddress` | `string` | 最終アクセス IP アドレス |
| `lastUsedAt` | `string` | 最終利用日時（ISO 8601） |
| `isCurrent` | `boolean` | JWT の sessionId と一致する場合 true |

**現在端末のログアウト（POST /api/auth/logout）の失敗時動作**:
- API 失敗時でも **フロントエンドの認証状態（AccessToken・User）は常にクリアされる**（try/finally で保証）
- サーバーセッションと HttpOnly Cookie は残存する可能性がある
- 次回アプリ起動時、残存 Cookie で `POST /api/auth/refresh` が成功すると再認証される
- エラー通知は遷移後の LoginPage（`navigate('/login', { state: { logoutError } })`）で表示する

### 1-6. プロフィール編集フロー
```
プロフィール画面で「プロフィールを編集」をクリック
    │
編集モーダルを表示（表示名・自己紹介・現在の値がプリセット）
    │
情報を変更して「保存」をクリック
    │
    ├── バリデーションエラー → エラーメッセージを表示
    │
    └── 保存成功 → プロフィール画面を更新して表示
```

---

## 2. ユースケース

### UC-01: 新規ユーザー登録

| 項目 | 内容 |
|---|---|
| UC-ID | UC-01 |
| ユースケース名 | 新規ユーザー登録 |
| アクター | 未認証ユーザー |
| 事前条件 | アプリにアクセス済み、アカウントを持っていない |
| 事後条件 | アカウントが作成され、AccessToken + RefreshToken が発行される |

**基本フロー:**
1. `/register` にアクセスする
2. ユーザー名・表示名・メールアドレス・パスワードを入力する
3. 「登録する」ボタンをクリックする
4. バックエンドがバリデーションを行い、DB にユーザーを保存する
5. AccessToken + RefreshToken を発行する
6. RefreshToken は httpOnly Cookie にセット、AccessToken はレスポンスで返す
7. フロントエンドが AccessToken をメモリに保存する
8. タイムライン画面へ遷移する

**代替フロー（バリデーションエラー）:**
- ユーザー名が既に使用済み → 「このユーザー名はすでに使用されています」
- メールアドレスが既に登録済み → 「このメールアドレスはすでに登録されています」
- パスワードが 8 文字未満 → 「パスワードは 8 文字以上で入力してください」

---

### UC-02: ログイン

| 項目 | 内容 |
|---|---|
| UC-ID | UC-02 |
| ユースケース名 | ログイン |
| アクター | 未認証ユーザー |
| 事前条件 | アカウントを持っている |
| 事後条件 | AccessToken + RefreshToken が発行され、認証済み状態になる |

**基本フロー:**
1. `/login` にメールアドレスとパスワードを入力する
2. 「ログイン」ボタンをクリックする
3. バックエンドが認証情報を検証する
4. AccessToken + RefreshToken を発行する
5. タイムライン画面へ遷移する

---

### UC-03: ログアウト

| 項目 | 内容 |
|---|---|
| UC-ID | UC-03 |
| ユースケース名 | ログアウト |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み |
| 事後条件 | RefreshToken が無効化され、未認証状態になる |

---

### UC-04: AccessToken リフレッシュ

| 項目 | 内容 |
|---|---|
| UC-ID | UC-04 |
| ユースケース名 | AccessToken リフレッシュ |
| アクター | 認証済みユーザー（Axios インターセプターが自動実行） |
| 事前条件 | AccessToken が期限切れ、有効な RefreshToken が Cookie に存在 |
| 事後条件 | 新しい AccessToken が発行され、元のリクエストが成功する |

---

### UC-05 / UC-06: プロフィール表示・編集

省略（概要は業務フロー参照）

---

### UC-23: ログイン中セッション一覧取得

| 項目 | 内容 |
|---|---|
| UC-ID | UC-23 |
| ユースケース名 | ログイン中セッション一覧取得 |
| アクター | 認証済みユーザー（自分のみ） |
| 事前条件 | ログイン済み |
| 事後条件 | 端末ごとのセッション情報が表示される |

---

### UC-24: 指定セッションのログアウト

| 項目 | 内容 |
|---|---|
| UC-ID | UC-24 |
| ユースケース名 | 指定セッションのログアウト |
| アクター | 認証済みユーザー（自分のみ） |
| 事前条件 | ログイン済み、対象 session_id が存在 |
| 事後条件 | 指定 session_id の RefreshToken が無効化される |

---

### UC-25: 全端末ログアウト

| 項目 | 内容 |
|---|---|
| UC-ID | UC-25 |
| ユースケース名 | 全端末ログアウト |
| アクター | 認証済みユーザー（自分のみ） |
| 事前条件 | ログイン済み |
| 事後条件 | 当該ユーザーの全セッション（または現在端末以外）が無効化される |

---

## 3. 機能要件

### 入力バリデーション

| フィールド | ルール |
|---|---|
| ユーザー名 | 必須、3〜20 文字、英数字とアンダースコアのみ、ユニーク |
| 表示名 | 必須、1〜50 文字 |
| メールアドレス | 必須、メール形式、ユニーク |
| パスワード | 必須、8 文字以上 |
| 自己紹介 | 任意、160 文字以内 |

### JWT 仕様

- [ ] AccessToken 有効期限: 15 分
- [ ] RefreshToken 有効期限: 7 日
- [ ] RefreshToken はトークンローテーション方式（使用時に旧トークンを revoked_at でマーク）
- [ ] ローテーション時に `replaced_by_token_id` を保存し、失効済みトークン再利用（リプレイ）を検知する
- [ ] RefreshToken は DB に token_hash（SHA-256 ハッシュ）のみ保存（生トークン保存不可）
- [ ] RefreshToken はセッション（端末）単位で管理し、`session_id` で個別失効できること
- [ ] パスワードは bcrypt（saltRounds=12）でハッシュ化

### セッション管理仕様

- [ ] `GET /api/auth/sessions` で自分のアクティブセッション一覧を取得できる
- [ ] `DELETE /api/auth/sessions/:sessionId` で指定端末のみログアウトできる
- [ ] `DELETE /api/auth/sessions` で全端末ログアウトできる
- [ ] 期限切れ/失効済みトークンを日次ジョブで削除する（保持期間を定義）

### RefreshToken Cookie 設定

| 属性 | 値 |
|------|---|
| HttpOnly | true（JavaScript からアクセス不可） |
| Secure | 本番: `true`（HTTPS のみ送信）、ローカル開発: `false`（HTTP のため。`NODE_ENV` で切り替え） |
| SameSite | Strict（CSRF 対策） |
| Domain | `<本番ドメイン>`（ローカルは localhost） |
| Path | `/api/auth`（Auth エンドポイントのみ Cookie を送信） |

### セキュリティ要件

- [ ] `/api/auth/refresh` は Origin/Referer 検証を行う
- [ ] 認証試行（login/refresh）にレート制限を適用する（IP + アカウント識別子）
- [ ] 監査ログ（ログイン成功/失敗、トークン再発行、個別失効、全端末失効）を記録する
- [ ] ログ出力時に token/cookie/password などの機微情報をマスキングする

### フロントエンドのトークン管理

- AccessToken: JavaScript メモリ（localStorage/sessionStorage には保存しない）
- RefreshToken: httpOnly Cookie（JavaScript からアクセス不可）
- Axios インターセプター: 401 エラー時に自動リフレッシュを試み、失敗時はログイン画面へリダイレクト

### プロフィール画像

- [ ] アバター画像は S3 に保存し、image_key を DB 管理する（URL は保存しない）
- [ ] アバター画像は JPEG / PNG / WebP を許可し、最大ファイルサイズは 10MB
- [ ] アバター未設定時はデフォルトアイコンを表示
- [ ] S3 key: `images/avatars/{userId}/{uuid}.{ext}`

---

## 4. API 設計

| メソッド | エンドポイント | 説明 | 認証 |
|---|---|---|---|
| POST | `/api/auth/register` | 新規ユーザー登録（HTTP 200） | 不要 |
| POST | `/api/auth/login` | ログイン・JWT 発行（HTTP 200） | 不要 |
| POST | `/api/auth/refresh` | AccessToken リフレッシュ | Cookie（RefreshToken） |
| POST | `/api/auth/logout` | ログアウト・RefreshToken 無効化 | 必要 |
| GET | `/api/auth/sessions` | ログイン中セッション一覧 | 必要 |
| DELETE | `/api/auth/sessions/:sessionId` | 指定端末ログアウト | 必要 |
| DELETE | `/api/auth/sessions` | 全端末ログアウト | 必要 |
| GET | `/api/users/:id` | プロフィール取得 | 必要 |
| PATCH | `/api/users/me/profile` | プロフィール更新 | 必要 |
| PATCH | `/api/users/me/avatar` | アバター画像アップロード | 必要 |
