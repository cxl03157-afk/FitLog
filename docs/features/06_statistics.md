# 機能定義書：週間・月間集計機能

## 1. 業務フロー

### 1-1. 集計閲覧フロー
```
ナビゲーションバーの統計アイコンをクリック → /stats に遷移
    │
デフォルトで「週間」タブを表示
    │
GET /api/stats/weekly?startDate=YYYY-MM-DD でデータ取得
    │
グラフを描画（棒グラフ: 日別トレーニング回数・ボリューム）
    │
「月間」タブに切り替え
    │
GET /api/stats/monthly?year=YYYY&month=MM でデータ取得
    │
グラフを描画（棒グラフ: 週別 or 月内日別トレーニング回数）
    │
種目別集計ドロップダウンで種目を選択
    │
GET /api/stats/exercise/:exerciseId でデータ取得
    │
折れ線グラフ（重量の最大値推移）を描画
```

---

## 2. ユースケース

### UC-19: 週間・月間集計閲覧

| 項目 | 内容 |
|---|---|
| UC-ID | UC-19 |
| ユースケース名 | 週間・月間集計閲覧 |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み、トレーニング記録が存在する |
| 事後条件 | 集計データがグラフで表示される |

---

### UC-20: 種目別集計閲覧

| 項目 | 内容 |
|---|---|
| UC-ID | UC-20 |
| ユースケース名 | 種目別集計閲覧 |
| アクター | 認証済みユーザー |
| 事前条件 | ログイン済み、種目記録が存在する |
| 事後条件 | 選択した種目の最大重量推移グラフが表示される |

---

## 3. 集計仕様

### 週間集計レスポンス例

```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-07",
  "days": [
    { "date": "2024-01-01", "workoutCount": 1, "totalVolume": 5250.0 },
    { "date": "2024-01-02", "workoutCount": 0, "totalVolume": 0 },
    ...
  ],
  "summary": {
    "totalWorkouts": 4,
    "totalSets": 32,
    "totalVolume": 18500.0,
    "mostFrequentExercise": "ベンチプレス"
  }
}
```

### 月間集計レスポンス例

```json
{
  "year": 2024,
  "month": 1,
  "weeks": [
    { "week": 1, "workoutCount": 4, "totalVolume": 18500.0 },
    ...
  ],
  "summary": {
    "totalWorkouts": 16,
    "totalSets": 128,
    "totalVolume": 74000.0
  }
}
```

### 種目別集計レスポンス例

```json
{
  "exerciseId": 1,
  "exerciseName": "ベンチプレス",
  "records": [
    { "date": "2024-01-01", "maxWeight": 80.0, "maxReps": 5 },
    { "date": "2024-01-08", "maxWeight": 82.5, "maxReps": 5 },
    ...
  ]
}
```

---

## 4. API 設計

| メソッド | エンドポイント | 説明 | 認証 |
|---|---|---|---|
| GET | `/api/stats/weekly` | 週間集計取得 | 必要 |
| GET | `/api/stats/monthly` | 月間集計取得 | 必要 |
| GET | `/api/stats/exercise/:exerciseId` | 種目別集計取得 | 必要 |

### クエリパラメータ

| エンドポイント | パラメータ | 説明 |
|---|---|---|
| `/api/stats/weekly` | `startDate` | 集計開始日（YYYY-MM-DD）。デフォルト: 今週月曜日 |
| `/api/stats/monthly` | `year`, `month` | 対象年月。デフォルト: 当月 |
| `/api/stats/exercise/:exerciseId` | `limit` | 取得件数（直近 N 回分）。デフォルト: 30 |
