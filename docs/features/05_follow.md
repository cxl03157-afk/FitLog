# 機能定義書：フォロー機能

## 1. 業務フロー

### 1-1. フォローフロー
```
他ユーザーのプロフィール画面（/users/:id）を表示
    │
「フォロー」ボタンをクリック
    │
POST /api/follows/:userId を実行
    │
    ├── 既にフォロー済み → 409 Conflict（DB UNIQUE 制約で防止）
    ├── 自己フォロー → 400 Bad Request（DB CHECK 制約で防止）
    │
    └── 成功
            │
        DB に follows レコードを追加
            │
        ボタンを「フォロー中」に変更
            │
        フォロー数を +1 して表示
```

### 1-2. フォロー解除フロー
```
フォロー中ユーザーのプロフィール画面で「フォロー中」ボタンをクリック
    │
DELETE /api/follows/:userId を実行
    │
    └── 成功
            │
        DB の follows レコードを削除
            │
        ボタンを「フォロー」に変更
```

### 1-3. ユーザー検索フロー
```
ナビゲーションバーの検索アイコンをクリック → /search に遷移
    │
検索フィールドにユーザー名を入力（インクリメンタル検索）
    │
GET /api/users/search?username=xxx で検索
    │
検索結果一覧を表示（アバター・表示名・ユーザー名・フォローボタン）
    │
フォローボタンをクリック → フォロー / フォロー解除
```

---

## 2. ユースケース

### UC-15: フォロー

| 項目 | 内容 |
|---|---|
| UC-ID | UC-15 |
| ユースケース名 | フォロー |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み、他ユーザーのプロフィールを表示中 |
| 事後条件 | follows レコードが追加される |

---

### UC-16: フォロー解除

| 項目 | 内容 |
|---|---|
| UC-ID | UC-16 |
| ユースケース名 | フォロー解除 |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み、フォロー中ユーザーを表示中 |
| 事後条件 | follows レコードが削除される |

---

### UC-17: ユーザー検索

| 項目 | 内容 |
|---|---|
| UC-ID | UC-17 |
| ユースケース名 | ユーザー検索 |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み |
| 事後条件 | 検索条件に一致するユーザー一覧が表示される |

---

## 3. 機能要件

- [ ] 自己フォロー不可（DB CHECK 制約 `follower_id <> followee_id`）
- [ ] 二重フォロー不可（DB UNIQUE 制約 `(follower_id, followee_id)`）
- [ ] フォロー中タイムラインは、フォロー中ユーザー（自分含む）の投稿を表示すること
- [ ] プロフィール画面にフォロー中数・フォロワー数を表示すること
- [ ] ユーザー検索はユーザー名の部分一致（ILIKE '%xxx%'）で検索すること

---

## 4. API 設計

| メソッド | エンドポイント | 説明 | 認証 |
|---|---|---|---|
| POST | `/api/follows/:userId` | フォロー | 必要 |
| DELETE | `/api/follows/:userId` | フォロー解除 | 必要 |
| GET | `/api/users/search` | ユーザー検索 | 必要 |
| GET | `/api/users/:id` | プロフィール取得（フォロー数含む） | 必要 |
| PATCH | `/api/users/me/profile` | プロフィール更新 | 必要 |
| GET | `/api/users/:id/followers` | フォロワー一覧 | 必要 |
| GET | `/api/users/:id/following` | フォロー中一覧 | 必要 |

---

### GET `/api/users/:id` — プロフィール取得

- 認証: JWT 必須
- 全ユーザーのプロフィールを取得可能（ブロック機能なし）
- 自分自身を取得した場合: `isFollowing = false`
- 存在しないユーザーの場合: 404 Not Found

**レスポンス例**:
```json
{
  "id": "1",
  "username": "alice",
  "displayName": "Alice",
  "bio": "トレーニング好き",
  "avatarUrl": "http://localhost:4566/fitlog/images/avatars/1/xxx.jpg",
  "postCount": 5,
  "followerCount": 3,
  "followingCount": 2,
  "isFollowing": true
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `avatarUrl` | `string \| null` | `avatarKey` が null なら null、それ以外は `IMAGE_BASE_URL + "/" + avatarKey` |
| `isFollowing` | `boolean` | 現在のログインユーザーがこのユーザーをフォローしているか |
| `postCount` | `number` | 投稿数 |
| `followerCount` | `number` | フォロワー数 |
| `followingCount` | `number` | フォロー中の数 |

---

### GET `/api/users/search` — ユーザー検索

**クエリパラメータ**:

| パラメータ | 型 | 制約 | 説明 |
|---|---|---|---|
| `username` | string | 必須・空白のみ不可・最大20文字 | ユーザー名の部分一致検索（ILIKE） |
| `limit` | number | 任意・1〜50・デフォルト20 | 取得件数 |

**バリデーション**:
- `username` は `@IsString()` + `@Transform(trim)` + `@Matches(/\S/)` + `@MaxLength(20)`
- `limit` は `@Type(() => Number)` + `@IsInt()` + `@Min(1)` + `@Max(50)`
- `username` 未指定 → 400 / 空白のみ → 400 / `limit=abc` or 小数 → 400

**仕様**:
- trim 済みの値で ILIKE `%xxx%` 検索（大文字・小文字区別なし）
- 2文字未満の制限はフロントエンドのみ（バックエンドは1文字以上を受け付ける）
- 自分自身も結果に含む
- 結果ソート: username ASC
- 0件: 200 + 空配列

**レスポンス例**:
```json
[
  {
    "id": "2",
    "username": "alice",
    "displayName": "Alice",
    "avatarUrl": "http://localhost:4566/fitlog/images/avatars/2/abc.jpg",
    "isFollowing": false
  }
]
```

---

### PATCH `/api/users/me/profile` — プロフィール更新

**リクエストボディ**（すべて optional）:

| フィールド | 型 | 制約 |
|---|---|---|
| `displayName` | `string` | `@Transform(trim)` → trim後に `@MinLength(1) @MaxLength(50)`（空白のみ → 400） |
| `bio` | `string \| null` | 空文字・trim後空文字 → null として保存。それ以外は trim なし保持。`@MaxLength(160)` |

**仕様**:
- 空オブジェクト `{}` → no-op（変更なし）
- 未知フィールド → 400（`forbidNonWhitelisted: true`）

**レスポンス例**:
```json
{
  "id": "1",
  "username": "alice",
  "displayName": "Alice（更新後）",
  "bio": null,
  "avatarUrl": "http://localhost:4566/fitlog/images/avatars/1/xxx.jpg"
}
```

---

### GET `/api/users/:id/followers` / `/api/users/:id/following` — フォロワー・フォロー中一覧

**仕様**:
- 存在しないユーザーの場合: 404 Not Found（`usersService.findById` が throw）
- 存在するユーザーでフォロワーがいない場合: 200 + 空配列
- `isFollowing`: 現在のログインユーザーが各ユーザーをフォローしているか
- N+1 回避: QueryBuilder + EXISTS サブクエリで全ユーザー分を一括取得

**レスポンス例**:
```json
[
  {
    "id": "2",
    "username": "bob",
    "displayName": "Bob",
    "avatarUrl": "http://localhost:4566/fitlog/images/avatars/2/xyz.jpg",
    "isFollowing": true
  }
]
```

| フィールド | 型 | 説明 |
|---|---|---|
| `avatarUrl` | `string \| null` | `avatarKey` が null なら null |
| `isFollowing` | `boolean` | 現在のログインユーザーがこのユーザーをフォローしているか |

**N+1 回避方針**（Phase 10 確定）:
```typescript
// QueryBuilder + EXISTS サブクエリで isFollowing を一括取得
// ユーザーごとに個別クエリを発行しない
.addSelect(
  `EXISTS(SELECT 1 FROM follows mf WHERE mf.follower_id = :currentUserId AND mf.followee_id = u.id)`,
  'isFollowing',
)
```
