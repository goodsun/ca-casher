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
- RPCエラー時: キャッシュから返却（Stale-While-Revalidate）
- DynamoDB障害時: 直接RPCへフォールバック
- レート制限時: 429エラーとRetry-Afterヘッダー

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

# Lambda設定
LOG_LEVEL=info
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


