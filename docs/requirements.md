# 要件定義書

## 概要
AWS上にスマートコントラクトのview関数の結果をキャッシュするサーバーを構築する。

## 基本要件
- 同じリクエストはキャッシュから返す
- 定期的にイベントを監視し変更があった場合関連のキャッシュをクリアする
- キャッシュ対象はread-onlyの情報のみ

## 監視対象
- .envファイルで指定されたコントラクトアドレス（CA）を監視
- 複数のCAを同時に監視可能

## キャッシュ対象の関数
- `tokenURI(tokenId)`
- `owner()` / `ownerOf(tokenId)`
- `totalSupply()`
- `balanceOf(address)`
- `name()`, `symbol()`
- その他頻繁に呼ばれるview関数

## アーキテクチャ方針
- コスト最適化を最優先
- シンプルな構成で運用負荷を最小化

## 想定構成
### API層
- API Gateway (REST API) - 従量課金
- Lambda関数 - 128MB メモリで十分

### キャッシュ層
- DynamoDB（完全従量課金）
  - TTL属性で自動削除
  - オンデマンド料金モデル

### イベント監視
- EventBridge Scheduler で定期実行（5分間隔）
- Lambda関数でRPCポーリング

## コスト削減策
- Lambda の ARM (Graviton2) 利用
- API Gateway キャッシュも活用
- CloudFront でさらにキャッシュ層を追加（オプション）
- 監視間隔を長めに設定（5-10分）

## Lambda同時実行数の制限
### なぜ必要か
- 予期しないトラフィック急増による高額請求を防ぐ
- RPC エンドポイントのレート制限対策

### 設定方法
```
# Lambda関数の予約済み同時実行数
同時実行数: 10-20程度に制限
```

### メリット
- コストの上限が予測可能
- 429エラー時は自動的にスロットリング

## API Gateway使用量プラン
### 設定内容
```
レート: 10リクエスト/秒
バースト: 20リクエスト
月間クォータ: 100万リクエスト
```

### 実装方法
1. APIキーを発行
2. 使用量プランを作成
3. ステージに紐付け

### 料金体系
- 基本料金なし
- APIキー管理も無料
- リクエスト数に応じた従量課金のみ

## キャッシュ戦略
### TTL設定
| 関数名 | TTL | 理由 |
|--------|-----|------|
| name(), symbol() | 24時間 | 変更されない |
| tokenURI() | 1時間 | メタデータ更新の可能性 |
| owner() | 5分 | 所有権移転の可能性 |
| totalSupply() | 5分 | ミント/バーンの可能性 |
| balanceOf() | 1分 | 頻繁な変更 |
| ownerOf() | 5分 | NFT譲渡の可能性 |

### キャッシュキー設計
```
{chain_id}:{contract_address}:{function_name}:{parameters}
例: 1:0x123...abc:tokenURI:42
```

## イベント監視設計
### 監視対象イベント
- Transfer
- Approval
- ApprovalForAll
- OwnershipTransferred（該当する場合）

### キャッシュ無効化ルール
- Transfer発生時: 関連するbalanceOf, ownerOfをクリア
- OwnershipTransferred: owner()をクリア
- その他: totalSupply等の全体情報を定期クリア

## セキュリティ要件
- APIキーによるアクセス制御
- CORS設定で許可ドメインを制限
- RPC URLは環境変数で管理
- ログに機密情報を出力しない

## エラーハンドリング
### 基本戦略
- RPCエラー時: キャッシュから返却（Stale-While-Revalidate）
- DynamoDB障害時: 直接RPCへフォールバック
- レート制限時: 429エラーとRetry-Afterヘッダー

### 実装済み高度なエラーハンドリング

#### 1. Stale Cache Fallback
RPC 呼び出しが失敗した場合、期限切れのキャッシュデータを返却します：
```json
{
  "result": "cached_value",
  "cached": true,
  "stale": true,
  "cachedAt": "2025-06-24T06:22:40.870Z"
}
```

#### 2. コントラクトホワイトリスト
未承認のコントラクトアドレスに対してはエラーを返します：
```json
{
  "error": "Contract not whitelisted",
  "message": "The contract 0x... is not in the whitelist"
}
```

#### 3. 認証エラー（開発環境）
APIキーが必要な環境でキーが不足している場合：
```json
{
  "error": "Missing Authentication Token",
  "message": "API key is required for this environment"
}
```

#### 4. 未対応関数エラー
サポートされていない関数を呼び出した場合：
```json
{
  "error": "Unsupported function",
  "message": "Function 'functionName' is not supported"
}
```

#### 5. TBA関数の特殊パラメータ処理
TBA関数は特殊なパラメータ形式を持つため、専用のパラメータ解析を実装：
- `account` 関数: 5つのパラメータ（implementation, chainId, tokenContract, tokenId, salt）
- `isValidSignature` 関数: 2つのパラメータ（hash, signature）

#### 6. RPC タイムアウト設定
環境変数 `RPC_TIMEOUT` でタイムアウト時間を制御（デフォルト: 5秒）

## 環境変数設計
### .env ファイル構成
```env
# 監視対象コントラクト
CONTRACT_ADDRESSES=0x123...,0x456...
CHAIN_ID=1

# RPC設定
RPC_ENDPOINT=https://...
RPC_TIMEOUT=5000

# DynamoDB設定
TABLE_NAME=ca-cache
TTL_ATTRIBUTE=expireAt

# API設定
API_KEYS=key1,key2
ALLOWED_ORIGINS=https://example.com
REQUIRE_API_KEY=true

# Lambda設定
LOG_LEVEL=info
NODE_OPTIONS=--enable-source-maps

# 環境設定
ENVIRONMENT=production
```

### 実装済み環境変数リスト

#### プロダクション環境 (.env.production)
```env
CHAIN_ID=137
CONTRACT_ADDRESSES=0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7,0x63c8A3536E4A647D48fC0076D442e3243f7e773b,0xa8a05744C04c7AD0D31Fcee368aC18040832F1c1
RPC_ENDPOINT=https://polygon-mainnet.g.alchemy.com/v2/[API_KEY]
RPC_TIMEOUT=5000
TABLE_NAME=ca-cache-prod
TTL_ATTRIBUTE=expireAt
REQUIRE_API_KEY=false
ALLOWED_ORIGINS=*
LOG_LEVEL=info
NODE_OPTIONS=--enable-source-maps
ENVIRONMENT=production
```

#### 開発環境 (.env.local)
```env
CHAIN_ID=1
CONTRACT_ADDRESSES=0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D,0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB
RPC_ENDPOINT=https://eth-mainnet.g.alchemy.com/v2/[API_KEY]
RPC_TIMEOUT=5000
TABLE_NAME=ca-cache-local
TTL_ATTRIBUTE=expireAt
REQUIRE_API_KEY=true
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000
LOG_LEVEL=debug
NODE_OPTIONS=--enable-source-maps
ENVIRONMENT=local
```

## 運用要件
### モニタリング
- CloudWatch Logs: 全Lambda実行ログ
- CloudWatch Metrics: カスタムメトリクス
  - キャッシュヒット率
  - RPCエラー率
  - レスポンスタイム

### アラート設定
- エラー率 > 5%
- レスポンスタイム > 1秒
- 月間リクエスト数 > 設定値の80%
- DynamoDB読み取り/書き込みエラー

### デプロイメント
- Infrastructure as Code: AWS CDK推奨
- CI/CD: GitHub Actions
- 環境: dev, staging, production

## 拡張性・将来対応
### マルチチェーン対応
- チェーンIDごとに異なるRPCエンドポイント
- キャッシュキーにchain_id含む（実装済み）

### 将来的な機能拡張
- Webhook通知（キャッシュ更新時）
- GraphQL API対応
- WebSocket サブスクリプション
- バッチ処理API

## 非機能要件
### パフォーマンス
- API レスポンス: 100ms以内（キャッシュヒット時）
- 可用性: 99.5%以上

### スケーラビリティ
- 初期: 10万リクエスト/月
- 最大: 100万リクエスト/月まで自動スケール


