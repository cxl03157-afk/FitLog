# 技術スタック

## フロントエンド

| 技術 | バージョン | 選定理由 |
|------|-----------|---------|
| Node.js | 22 LTS | LTS版。フロント・バック共通ランタイム |
| React | 19 | コンポーネントベース UI。RAISETIMELINE で習得済みのため生産性が高い |
| TypeScript | 6.x | 型安全性の確保。バックエンドと型定義を揃えやすい |
| Vite | 8.x | 高速な開発サーバー・ビルドツール |
| Tailwind CSS | 3.x | ユーティリティファーストCSS。MUI（RAISETIMELINE）と異なるアプローチを学ぶ |
| React Router | v7 | SPA ルーティング |
| Axios | 1.x | HTTP クライアント。AccessToken 自動付与・401 リトライインターセプターを実装 |
| Vitest | 4.x | Vite ネイティブテストランナー |
| Playwright | 1.x | E2E テスト |

---

## バックエンド

| 技術 | バージョン | 選定理由 |
|------|-----------|---------|
| Node.js | 22 LTS | LTS版。長期サポートで安定 |
| NestJS | 11.x | Spring Boot に近い Module/Controller/Service/Repository 構成。Java → TypeScript の移行コストが低い |
| TypeScript | 5.x | バックエンドも TypeScript で統一。型ミスをビルド時に検出 |
| TypeORM | 1.0.x | JPA/Hibernate に近いデコレーター設計。RAISETIMELINE の知識を活かせる |
| Passport-JWT | — | NestJS 公式の認証ライブラリ。AccessToken + RefreshToken に対応 |
| class-validator | — | NestJS DTO のバリデーション |
| @nestjs/swagger | — | OpenAPI 仕様を自動生成。Swagger UI で確認可能 |
| AWS SDK v3 | 3.x | S3 操作（Multer + サーバー中継方式） |
| Multer | — | ファイルアップロード処理（NestJS と統合） |
| bcrypt | — | パスワードハッシュ（saltRounds=12） |
| Jest | 29.x | バックエンドユニットテスト |

---

## データベース

| 技術 | バージョン | 選定理由 |
|------|-----------|---------|
| PostgreSQL | 17 | RAISETIMELINE と同じ。信頼性が高くJSONB・インデックス機能が豊富 |

---

## ストレージ・インフラ（ローカル開発）

| 技術 | 用途 |
|------|------|
| Docker Compose | PostgreSQL + LocalStack を一括管理 |
| LocalStack | AWS S3 エミュレータ（ポート 4566）。本番と同じコードでローカル動作確認 |

---

## ストレージ・インフラ（本番）

| 技術 | 用途 |
|------|------|
| AWS CloudFront | 単一ディストリビューション。`/api/*` → ALB、`/*` → S3 |
| AWS S3 | フロントエンドSPA・画像の保存（単一バケット） |
| AWS ALB | HTTP ロードバランサー → EC2 ターゲット |
| AWS EC2 | Amazon Linux 2023。Docker + docker compose up でNestJS コンテナ起動 |
| AWS RDS | PostgreSQL 17（プライベートサブネット） |
| AWS CloudWatch Logs | NestJS アプリログの転送・保管 |
| AWS SSM Parameter Store | 本番環境変数の管理（シークレット保管） |

### CloudFront ビヘイビア設定

| パス | オリジン | キャッシュ | 備考 |
|-----|---------|----------|------|
| `/api/*` | ALB | TTL=0（キャッシュ無効） | Cookie + Authorization ヘッダーを転送 |
| `/assets/*` | S3 | 長期キャッシュ（Cache-Optimized） | Vite がコンテンツハッシュをファイル名に含めるため安全 |
| `/images/*` | S3 | 長期キャッシュ | OAC。画像 key は UUID で一意生成のため上書き不可 |
| `/*`（デフォルト） | S3 | TTL=0（index.html） | CloudFront Function でSPAルーティング（index.htmlへ書き換え） |

---

## CI/CD

| 技術 | 用途 |
|------|------|
| GitHub Actions | 機能単位でCIワークフローを追加。フロント（Lint/Test/Build）・バック（Jest） |
| Docker | ローカル開発・本番デプロイ共通イメージ |

---

## 開発ツール

| 技術 | 用途 |
|------|------|
| ESLint | フロント・バック共通のLintルール |
| Prettier | コードフォーマット統一 |
| NestJS CLI | `nest generate` でモジュール・コントローラー・サービスを生成 |
