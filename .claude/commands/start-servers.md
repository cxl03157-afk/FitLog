# サーバー起動ルール

このプロジェクトでサーバーを起動する際は以下のルールを**必ず**守ること。

## 指定ポート

| サービス | ポート |
|---------|--------|
| NestJS（バックエンド） | 3000 |
| Vite（フロントエンド） | 5173 |
| PostgreSQL（Docker） | 5432 |
| LocalStack（S3エミュレータ） | 4566 |

## ポート競合時のルール

**別ポートへの変更は禁止。必ず指定ポートを使用する。**

ポート競合が発生した場合は、そのポートを使用しているプロセスを停止してから起動する：

```bash
# ポート 3000 を使用しているプロセスを停止
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# ポート 5173 を使用しているプロセスを停止
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
```

## 起動手順

```bash
# 1. PostgreSQL + LocalStack（Docker Compose）
docker compose up -d

# 2. DB 接続確認
pg_isready -h localhost -p 5432

# 3. バックエンド（NestJS） — port 3000
cd backend
npm run start:dev

# 4. フロントエンド（Vite） — port 5173
cd ../frontend
npm run dev
```

> 推奨: バックエンドとフロントエンドは別ターミナルで起動する。

## ヘルスチェック

```bash
# バックエンド
curl -s http://localhost:3000/api/health

# LocalStack S3
curl -s http://localhost:4566/_localstack/health

# フロントエンド
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

## 停止手順

```bash
# Docker サービスを停止
docker compose down

# バックエンド・フロントエンドは Ctrl+C で停止
```
