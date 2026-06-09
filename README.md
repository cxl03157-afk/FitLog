# FitLog

筋トレ・運動記録を SNS 形式で共有し、トレーニング仲間と励まし合えるアプリです。

## 機能

- **トレーニング記録投稿** — 種目・セット数・重量・写真を記録して共有
- **ナイス！** — 仲間の投稿に「ナイス！」でモーション付きリアクション
- **コメント** — アドバイス・応援コメントを投稿
- **フォロー** — トレーニング仲間をフォローしてタイムラインに表示
- **セッション管理（マルチデバイス）** — ログイン中端末の一覧表示、個別端末ログアウト、全端末ログアウト
- **週間・月間集計** — トレーニング頻度・ボリュームの推移をグラフで可視化
- **目標設定** — 種目ごとの目標重量・回数を設定して達成状況を管理

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 + TypeScript + Vite + Tailwind CSS |
| バックエンド | Node.js 22 LTS + NestJS 10 + TypeORM |
| DB | PostgreSQL 17 |
| ストレージ | AWS S3 + CloudFront（本番） / LocalStack（ローカル） |
| インフラ | CloudFront → ALB → EC2（Docker）+ RDS |
| CI/CD | GitHub Actions |

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [要件定義書](docs/要件定義書.md) | 目的・機能要件・非機能要件・スコープ |
| [機能一覧](docs/features.md) | ユースケース一覧・API エンドポイント一覧 |
| [画面設計](docs/screens.md) | 画面一覧・遷移図・各画面仕様 |
| [データベース設計](docs/database.md) | ER 図・テーブル定義 |
| [技術スタック](docs/tech-stack.md) | 使用技術・バージョン・選定理由 |
| [機能定義書](docs/features/) | 機能ごとの業務フロー・API 設計 |

## ローカル起動手順

### 前提条件

- Node.js 22 LTS
- Docker Desktop

### セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/<your-username>/FitLog.git
cd FitLog

# 2. PostgreSQL + LocalStack（S3エミュレータ）を起動
docker compose up -d

# 3. バックエンド（NestJS） — port 3000
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run start:dev

# 4. フロントエンド（Vite） — port 5173
cd frontend
npm install
npm run dev
```

アプリは http://localhost:5173 で起動します。  
API ドキュメント（Swagger UI）は http://localhost:3000/api/docs で確認できます。

## ブランチ・開発ルール

[CLAUDE.md](CLAUDE.md) を参照してください。

## ライセンス

MIT
