# CA Casher - Smart Contract Cache Server

スマートコントラクトのview関数の結果をキャッシュし、高速なレスポンスを提供するサーバーレスアプリケーションです。

## 概要

CA Casher は、Ethereum のスマートコントラクト（特に NFT コントラクト）の読み取り専用関数の結果を AWS 上でキャッシュし、RPC への負荷を軽減しながら高速なレスポンスを実現します。

### 主な機能

- スマートコントラクトの view 関数結果のキャッシュ
- イベント監視による自動キャッシュ無効化
- API キーによるアクセス制御
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

`.env.local.example` をコピーして `.env.local` を作成：

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して必要な値を設定：

```env
# 監視対象のコントラクトアドレス（カンマ区切り）
CONTRACT_ADDRESSES=0x1234...,0x5678...

# チェーン設定
CHAIN_ID=1
RPC_ENDPOINT=https://mainnet.infura.io/v3/YOUR_KEY

# DynamoDB テーブル名
TABLE_NAME=ca-casher-cache

# API 設定
API_KEYS=your-api-key-1,your-api-key-2
ALLOWED_ORIGINS=https://yourdomain.com

# ログレベル
LOG_LEVEL=info
```

### 5. CDK Bootstrap（初回のみ）

```bash
cdk bootstrap
```

### 6. デプロイ

```bash
# 自動デプロイスクリプト
./deploy.sh

# または手動で
npm run deploy
```

## 使用方法

### API エンドポイント

デプロイ後、以下の形式で API にアクセスできます：

```
GET https://your-api-id.execute-api.region.amazonaws.com/prod/contract/{address}/{function}
```

### 例

```bash
# tokenURI の取得
curl -H "x-api-key: YOUR_API_KEY" \
  https://api.example.com/prod/contract/0x123.../tokenURI?tokenId=1

# totalSupply の取得
curl -H "x-api-key: YOUR_API_KEY" \
  https://api.example.com/prod/contract/0x123.../totalSupply
```

### キャッシュ対象の関数

- `name()`, `symbol()` - 24時間キャッシュ
- `tokenURI(tokenId)` - 1時間キャッシュ
- `owner()`, `ownerOf(tokenId)` - 5分キャッシュ
- `totalSupply()` - 5分キャッシュ
- `balanceOf(address)` - 1分キャッシュ

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
./cleanup.sh
```

## トラブルシューティング

### API キーの取得

```bash
# API キー ID を確認
aws cloudformation describe-stacks \
  --stack-name CaCasherStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiKeyId'].OutputValue" \
  --output text

# API キーの値を取得
aws apigateway get-api-key \
  --api-key <API_KEY_ID> \
  --include-value
```

### DynamoDB テーブルの確認

```bash
aws dynamodb scan \
  --table-name ca-casher-cache \
  --limit 10
```

## ライセンス

MIT License
