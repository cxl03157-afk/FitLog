# 09 種目管理（Exercises）

## 業務フロー

標準種目（システム提供）とユーザー独自種目の2種類を管理する。
標準種目は変更・削除不可。独自種目は作成者のみが変更・削除できる。

```
ユーザー
  │
  ├─ GET  /api/exercises         → 標準種目＋自分の独自種目一覧
  ├─ GET  /api/exercises/:id     → 1件詳細（他ユーザーの独自種目は404）
  ├─ POST /api/exercises         → 独自種目を作成
  ├─ PATCH /api/exercises/:id   → 自分の独自種目を更新
  └─ DELETE /api/exercises/:id  → 自分の独自種目を削除
```

---

## 種目の種別

| 種別 | user_id | 説明 |
|------|---------|------|
| 標準種目 | `NULL` | Migration でシード済み（23件）。全ユーザーが参照可能。変更・削除不可 |
| 独自種目 | `作成者の user_id` | ユーザーが POST で作成。本人のみ参照・更新・削除可能 |

---

## ユースケース

| ID | ユースケース | 説明 |
|----|------------|------|
| UC-26 | 種目一覧取得 | 標準種目＋自分の独自種目を名前昇順で取得 |
| UC-27 | 独自種目作成 | 名前・カテゴリ（・説明）を指定して独自種目を登録 |
| UC-28 | 独自種目更新 | 自分が作成した種目の名前・カテゴリ・説明を変更 |
| UC-29 | 独自種目削除 | 自分が作成した種目を削除（使用中は不可） |

---

## 機能要件

### カテゴリ一覧

`胸` / `背中` / `脚` / `肩` / `腕` / `体幹` の 6 種類のみ有効。

### 同名制約

| チェック対象 | 結果 |
|------------|------|
| 標準種目と同名（大文字小文字・前後空白を無視） | 409 ConflictException |
| 自分の独自種目と同名 | 409 ConflictException |
| 他ユーザーの独自種目と同名 | 201 （許可） |

同名比較は `LOWER(TRIM(name))` で行う。

### 使用中削除制限

以下のいずれかから参照されている独自種目は削除不可（409）:
- `workout_exercises`（トレーニング投稿の種目記録）
- `goals`（目標設定）
- `personal_records`（パーソナルレコード）

---

## API 仕様

### GET /api/exercises

**概要:** 標準種目と自分の独自種目を名前昇順で返す

**認証:** 必須（Bearer JWT）

**レスポンス:** `200 OK`

```json
[
  {
    "id": "1",
    "userId": null,
    "name": "ベンチプレス",
    "category": "胸",
    "description": "フラットベンチでのバーベルプレス",
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "105",
    "userId": "42",
    "name": "ケーブルフライ変形",
    "category": "胸",
    "description": null,
    "createdAt": "2026-06-30T10:00:00.000Z"
  }
]
```

---

### GET /api/exercises/:id

**概要:** 1件の種目を取得する。他ユーザーの独自種目は存在を漏らさず 404 を返す

**認証:** 必須（Bearer JWT）

**レスポンス:**

| ステータス | 条件 |
|-----------|------|
| `200 OK` | 標準種目 または 自分の独自種目 |
| `401 Unauthorized` | 未認証 |
| `404 Not Found` | 存在しない / 他ユーザーの独自種目 |

---

### POST /api/exercises

**概要:** 独自種目を作成する

**認証:** 必須（Bearer JWT）

**リクエスト:**

```json
{
  "name": "ケーブルフライ変形",
  "category": "胸",
  "description": "説明（省略可）"
}
```

| フィールド | 必須 | 制約 |
|-----------|------|------|
| name | ✓ | 文字列・空文字不可・100文字以内 |
| category | ✓ | `胸` / `背中` / `脚` / `肩` / `腕` / `体幹` のいずれか |
| description | — | 文字列・500文字以内 |

**レスポンス:**

| ステータス | 条件 |
|-----------|------|
| `201 Created` | 作成成功（レスポンス body に `userId` を含む） |
| `401 Unauthorized` | 未認証 |
| `409 Conflict` | 標準種目または自分の独自種目と同名 |

---

### PATCH /api/exercises/:id

**概要:** 自分の独自種目を部分更新する

**認証:** 必須（Bearer JWT）

**リクエスト（すべて省略可能）:**

```json
{
  "name": "新しい名前",
  "category": "背中",
  "description": null
}
```

`description: null` を明示すると説明を削除（null に更新）する。フィールドを省略すると現在値を維持する。

**レスポンス:**

| ステータス | 条件 |
|-----------|------|
| `200 OK` | 更新成功（レスポンス body に更新後の種目を含む） |
| `401 Unauthorized` | 未認証 |
| `403 Forbidden` | 標準種目 または 他ユーザーの独自種目 |
| `404 Not Found` | 存在しない ID |
| `409 Conflict` | 変更後の名前が標準種目または自分の独自種目と衝突 |

---

### DELETE /api/exercises/:id

**概要:** 自分の独自種目を削除する

**認証:** 必須（Bearer JWT）

**レスポンス:**

| ステータス | 条件 |
|-----------|------|
| `204 No Content` | 削除成功 |
| `401 Unauthorized` | 未認証 |
| `403 Forbidden` | 標準種目 または 他ユーザーの独自種目 |
| `404 Not Found` | 存在しない ID |
| `409 Conflict` | workout_exercises / goals / personal_records から参照中 |

---

## レスポンス型（共通）

```typescript
{
  id: string;
  userId: string | null;  // null = 標準種目 / string = 独自種目の作成者 ID
  name: string;
  category: string;
  description: string | null;
  createdAt: Date;
}
```
