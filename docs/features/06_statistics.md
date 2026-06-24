# 機能定義書：週間・月間集計機能

## 1. 業務フロー

### 1-1. 集計閲覧フロー
```
ナビゲーションバーの統計アイコンをクリック → /stats に遷移
    │
デフォルトで「週間」タブを表示
    │
GET /api/stats/weekly でデータ取得
    │
棒グラフ（投稿回数・総ボリューム）を描画
    │
「月間」タブに切り替え
    │
GET /api/stats/monthly でデータ取得
    │
棒グラフを描画
    │
種目別集計ドロップダウンで種目を選択
    │
GET /api/stats/exercise/:exerciseId でデータ取得
    │
折れ線グラフ（最大重量または最大回数の推移）を描画
```

---

## 2. ユースケース

### UC-19: 週間・月間集計閲覧

| 項目 | 内容 |
|---|---|
| UC-ID | UC-19 |
| ユースケース名 | 週間・月間集計閲覧 |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み |
| 事後条件 | 直近12週または12か月の集計データがグラフで表示される |

---

### UC-20: 種目別集計閲覧

| 項目 | 内容 |
|---|---|
| UC-ID | UC-20 |
| ユースケース名 | 種目別集計閲覧 |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み、種目記録が存在する |
| 事後条件 | 選択した種目の最大重量または最大回数の推移グラフが表示される |

---

## 3. 集計仕様

### 週間集計レスポンス形式

- バックエンドが直近12週の固定配列を生成して返す
- 週は月曜始まり（PostgreSQL `DATE_TRUNC('week', ...)` の ISO 標準）
- `period` は週の開始日（月曜日）を `YYYY-MM-DD` 形式で返す
- レスポンスは古い週から新しい週への昇順
- データがない週は `{ period, postCount: 0, totalVolume: 0 }` で補完する

```json
[
  { "period": "2026-04-06", "postCount": 0, "totalVolume": 0 },
  { "period": "2026-04-13", "postCount": 2, "totalVolume": 8500 },
  { "period": "2026-04-20", "postCount": 0, "totalVolume": 0 },
  ...
  { "period": "2026-06-22", "postCount": 3, "totalVolume": 12500 }
]
```

12件固定。

### 月間集計レスポンス形式

- バックエンドが直近12か月の固定配列を生成して返す
- `period` は `YYYY-MM` 形式で返す
- レスポンスは古い月から新しい月への昇順
- データがない月は `{ period, postCount: 0, totalVolume: 0 }` で補完する

```json
[
  { "period": "2025-07", "postCount": 0, "totalVolume": 0 },
  ...
  { "period": "2026-06", "postCount": 10, "totalVolume": 42000 }
]
```

12件固定。

### totalVolume の計算式

```
SUM(weight_kg × reps)  ※ セット単位の合計、kg 単位
```

自重種目（weight_kg = 0）はボリュームに寄与しない（0 × reps = 0）。

### 種目別集計レスポンス形式

- 直近 `limit` トレーニング日分（デフォルト30日）を返す
- `limit` はセット数・投稿数ではなく **トレーニング日数**（`trained_on` の DISTINCT 日付）
- `metric` に応じて含める日付を絞り込む（詳細は下記）
- レスポンスは日付昇順

#### metric 判定ルール

| 条件 | metric | unit |
|---|---|---|
| 有効な重量記録（`weight_kg > 0`）が1件以上ある | `'weight'` | `'kg'` |
| 有効な重量記録なし、有効な回数記録（`reps >= 1`）が1件以上ある | `'reps'` | `'reps'` |
| 有効な重量・回数記録がどちらもない | `'none'` | `null` |

**混在ルール**: 同一種目に自重記録（weight_kg=0）と加重記録（weight_kg>0）が混在する場合、有効な重量記録を優先（`metric: 'weight'`）。加重記録がある日のみ `records` に含まれ、自重のみの日は除外される。

#### `records` に含める日付の絞り込み

- `metric: 'weight'`: `weight_kg > 0` の記録があるトレーニング日のみ
- `metric: 'reps'`: `reps >= 1` の記録があるトレーニング日のみ
- `metric: 'none'`: `records: []`

#### レスポンス例（重量種目）

```json
{
  "exerciseId": "1",
  "exerciseName": "ベンチプレス",
  "metric": "weight",
  "unit": "kg",
  "records": [
    { "date": "2026-06-01", "value": 80.0 },
    { "date": "2026-06-08", "value": 82.5 }
  ]
}
```

#### レスポンス例（自重種目）

```json
{
  "exerciseId": "2",
  "exerciseName": "懸垂",
  "metric": "reps",
  "unit": "reps",
  "records": [
    { "date": "2026-06-01", "value": 8 },
    { "date": "2026-06-08", "value": 10 }
  ]
}
```

#### レスポンス例（記録なし）

```json
{
  "exerciseId": "3",
  "exerciseName": "",
  "metric": "none",
  "unit": null,
  "records": []
}
```

---

## 4. API 設計

| メソッド | エンドポイント | 説明 | 認証 |
|---|---|---|---|
| GET | `/api/stats/weekly` | 週間集計取得（直近12週・0補完） | 必要 |
| GET | `/api/stats/monthly` | 月間集計取得（直近12か月・0補完） | 必要 |
| GET | `/api/stats/exercise/:exerciseId` | 種目別集計取得（最大値推移） | 必要 |

### クエリパラメータ

| エンドポイント | パラメータ | 型 | 説明 |
|---|---|---|---|
| `/api/stats/exercise/:exerciseId` | `limit` | integer | 取得するトレーニング日数（1〜90、デフォルト30） |
