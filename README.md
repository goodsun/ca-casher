# CA Casher - Smart Contract Cache Server

スマートコントラクトのview関数の結果をキャッシュし、高速なレスポンスを提供するサーバーレスアプリケーションです。

## 概要

CA Casher は、Ethereum のスマートコントラクト（特に NFT コントラクト）の読み取り専用関数の結果を AWS 上でキャッシュし、RPC への負荷を軽減しながら高速なレスポンスを実現します。

### 主な機能

- スマートコントラクトの view 関数結果のキャッシュ
- イベント監視による自動キャッシュ無効化
- 環境別の認証設定（APIキー認証 / パブリックアクセス）
- 複数環境対応（local/production）
- 完全サーバーレス構成でコスト最適化

## アーキテクチャ

- **API Gateway**: REST API エンドポイント
- **Lambda**: API ハンドラーとイベント監視
- **DynamoDB**: キャッシュストレージ（TTL 付き）
- **EventBridge**: 定期的なイベント監視

## 前提条件

- Node.js 20.x 以上
- AWS CLI 設定済み
- AWS CDK 2.165.0 以上

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/ca-casher.git
cd ca-casher
```

### 2. CDK プロジェクトの初期化

```bash
cd cdk
npm install
```

### 3. Lambda 関数の依存関係インストール

```bash
cd lambda
npm install
cd ..
```

### 4. 環境変数の設定

開発環境用（`.env.local`）を設定：

```env
# Environment
ENVIRONMENT=local

# Contract Addresses (comma separated)
CONTRACT_ADDRESSES=0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D,0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB

# Chain Configuration
CHAIN_ID=1
RPC_ENDPOINT=https://ethereum-rpc.publicnode.com

# DynamoDB Configuration
TABLE_NAME=ca-casher-cache-local

# API Configuration
API_KEYS=your-api-key-1,your-api-key-2
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com
REQUIRE_API_KEY=true

# Lambda Configuration
LOG_LEVEL=info

# AWS Configuration
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
AWS_DEFAULT_REGION=ap-northeast-1
```

本番環境用（`.env.production`）を設定：

```env
# Environment
ENVIRONMENT=production

# Contract Addresses (comma separated) - Production environment
CONTRACT_ADDRESSES=0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7

# Chain Configuration
CHAIN_ID=137
RPC_ENDPOINT=https://polygon-rpc.com

# DynamoDB Configuration
TABLE_NAME=ca-casher-cache-prod

# API Configuration
API_KEYS=prod-api-key-1,prod-api-key-2
ALLOWED_ORIGINS=https://yourdomain.com
REQUIRE_API_KEY=false

# Lambda Configuration
LOG_LEVEL=info

# AWS Configuration
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
AWS_DEFAULT_REGION=ap-northeast-1
```

### 5. CDK Bootstrap（初回のみ）

```bash
cdk bootstrap
```

### 6. デプロイ

```bash
# 開発環境にデプロイ
./deploy.sh local

# 本番環境にデプロイ
./deploy.sh production

# 環境指定なしの場合は local がデフォルト
./deploy.sh
```

## 使用方法

### API エンドポイント

デプロイ後、以下の形式で API にアクセスできます：

```
GET https://your-api-id.execute-api.region.amazonaws.com/prod/contract/{address}/{function}
```

### 認証設定による使い分け

#### パターン1: パブリックアクセス（本番環境推奨）
`REQUIRE_API_KEY=false` の場合、APIキーなしでアクセス可能：

```bash
# パブリックアクセス - APIキー不要
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/name"

# 結果: {"result":"BizenNFT","cached":true,"cachedAt":"2025-06-24T06:22:40.870Z"}
```

#### パターン2: APIキー認証（開発環境推奨）
`REQUIRE_API_KEY=true` の場合、APIキーが必要：

```bash
# APIキーの値を取得
aws apigateway get-api-key --api-key YOUR_API_KEY_ID --include-value

# APIキー認証でアクセス
curl -X GET "https://your-api-id.execute-api.region.amazonaws.com/prod/contract/0x123.../name" \
  -H "x-api-key: YOUR_API_KEY_VALUE"
```

### 使用例

```bash
# コントラクト名の取得
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/name"

# シンボルの取得
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/symbol"

# 総供給量の取得
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/totalSupply"

# カスタム関数の取得
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/getCreatorCount"
```

### キャッシュ対象の関数

デフォルトでサポートされている関数とキャッシュ期間：

- `name()`, `symbol()` - 24時間キャッシュ
- `tokenURI(tokenId)` - 1時間キャッシュ
- `owner()`, `ownerOf(tokenId)` - 5分キャッシュ
- `totalSupply()`, `getCreatorCount()` - 5分キャッシュ
- `balanceOf(address)` - 1分キャッシュ

### カスタム関数の追加

新しい関数をサポートするには：

1. **ABI定義の追加** (`lambda/ethereum.ts`):
```typescript
const ABI_FRAGMENTS = [
  // ... 既存の関数
  'function yourCustomFunction() view returns (uint256)',
];
```

2. **キャッシュ設定の追加** (`lambda/types.ts`):
```typescript
export const CACHE_TTL: Record<string, number> = {
  // ... 既存の設定
  'yourCustomFunction': 300, // 5分キャッシュ
};
```

3. **デプロイ**:
```bash
./deploy.sh production
```

## 開発

### ローカルテスト

```bash
# CDK のテスト
npm test

# CDK の差分確認
cdk diff
```

### ログの確認

```bash
# API Lambda のログ
aws logs tail /aws/lambda/ca-casher-api --follow

# イベントモニターのログ
aws logs tail /aws/lambda/ca-casher-event-monitor --follow
```

## 運用

### コスト管理

- Lambda 同時実行数: 20 に制限
- API Gateway レート制限: 10 req/sec
- 月間クォータ: 100万リクエスト

### モニタリング

CloudWatch ダッシュボードで以下をモニタリング：
- キャッシュヒット率
- API レスポンスタイム
- エラー率

### クリーンアップ

リソースを削除する場合：

```bash
# 開発環境の削除
./cleanup.sh local

# 本番環境の削除（確認プロンプトあり）
./cleanup.sh production
```

**注意**: 本番環境削除時は `DELETE-PRODUCTION` と入力する必要があります。

## 設定パターンとユースケース

### パターン1: 開発・テスト環境
```env
REQUIRE_API_KEY=true
ALLOWED_ORIGINS=http://localhost:3000,https://dev.example.com
```
**用途**: 開発チーム内での利用、API使用量の制御

### パターン2: パブリックAPI
```env
REQUIRE_API_KEY=false
ALLOWED_ORIGINS=*
```
**用途**: 一般公開API、フロントエンドアプリケーションでの利用

### パターン3: 企業内API
```env
REQUIRE_API_KEY=true
ALLOWED_ORIGINS=https://app.yourcompany.com,https://admin.yourcompany.com
```
**用途**: 社内システム、特定のドメインからのみアクセス許可

### パターン4: パートナーAPI
```env
REQUIRE_API_KEY=true
ALLOWED_ORIGINS=https://partner1.com,https://partner2.com
```
**用途**: ビジネスパートナーとのAPI連携

## トラブルシューティング

### API キーの取得

```bash
# スタック情報の確認
aws cloudformation describe-stacks --stack-name CaCasherStack-local

# API キー ID を確認（APIキー認証有効時のみ）
aws cloudformation describe-stacks \
  --stack-name CaCasherStack-local \
  --query "Stacks[0].Outputs[?OutputKey=='ApiKeyId'].OutputValue" \
  --output text

# API キーの値を取得
aws apigateway get-api-key \
  --api-key <API_KEY_ID> \
  --include-value
```

### 認証設定の確認

```bash
# 現在の環境設定を確認
cat .env.production

# パブリックアクセスのテスト
curl -X GET "https://your-api-endpoint/prod/contract/0x.../name"

# APIキー認証のテスト
curl -X GET "https://your-api-endpoint/prod/contract/0x.../name" \
  -H "x-api-key: YOUR_API_KEY"
```

### DynamoDB テーブルの確認

```bash
aws dynamodb scan \
  --table-name ca-casher-cache \
  --limit 10
```

## ライセンス

MIT License
