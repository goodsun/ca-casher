# CA Casher API Specification

## 概要

CA Casher は、スマートコントラクトのview関数の結果をキャッシュし、高速なレスポンスを提供するサーバーレスAPIです。ERC-721 NFTコントラクトを中心に、25個のview関数をサポートしています。

## API エンドポイント

### ベースURL
```
https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/
```

### エンドポイント形式
```
GET /contract/{contractAddress}/{functionName}[?parameters]
POST /contract/{contractAddress}/{functionName}[?parameters]
```

### 認証
- **プロダクション環境**: 認証なし（パブリックアクセス）
- **開発環境**: APIキー認証（`x-api-key` ヘッダー必須）

## サポート関数

### パラメータなしの関数（12個）

#### コントラクト基本情報
| 関数名 | 戻り値型 | キャッシュ期間 | 説明 |
|--------|----------|----------------|------|
| `name` | string | 24時間 | コントラクト名 |
| `symbol` | string | 24時間 | コントラクトシンボル |
| `totalSupply` | uint256 | 5分 | 総供給量 |

**使用例:**
```bash
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/name"
# レスポンス: {"result":"BizenNFT","cached":true,"cachedAt":"2025-06-24T06:22:40.870Z"}

curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/totalSupply"
# レスポンス: {"result":"86","cached":false}
```

#### コントラクト設定値
| 関数名 | 戻り値型 | キャッシュ期間 | 説明 |
|--------|----------|----------------|------|
| `INVERSE_BASIS_POINT` | uint16 | 24時間 | 基準点の逆数 |
| `_lastId` | uint256 | 1分 | 最後のトークンID |
| `_maxFeeRate` | uint256 | 1時間 | 最大手数料率 |
| `_mintFee` | uint256 | 1時間 | ミント手数料 |
| `_owner` | address | 1時間 | コントラクトオーナー |
| `_totalBurned` | uint256 | 5分 | 焼却済み総数 |

**使用例:**
```bash
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/_mintFee"
# レスポンス: {"result":"5000000000000000","cached":false}
```

#### クリエーター関連
| 関数名 | 戻り値型 | キャッシュ期間 | 説明 |
|--------|----------|----------------|------|
| `getCreatorCount` | uint256 | 5分 | クリエーター総数 |
| `getCreators` | address[] | 5分 | 全クリエーターのアドレス一覧 |
| `getTotalBurned` | uint256 | 5分 | 焼却済み総数（別関数） |

**使用例:**
```bash
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/getCreatorCount"
# レスポンス: {"result":"23","cached":false}

curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/getCreators"
# レスポンス: {"result":["0x5A636bdaB39414DE26735f8CDf6dded8b5bcA0e2","0x41dcCE71B7b89136CaFD8033bEc9ae005BEf9c7E",...]}
```

### パラメータありの関数（13個）

#### トークンID系関数（8個）

| 関数名 | パラメータ | 戻り値型 | キャッシュ期間 | 説明 |
|--------|------------|----------|----------------|------|
| `tokenURI` | tokenId | string | 1時間 | トークンメタデータURI |
| `ownerOf` | tokenId | address | 5分 | トークンオーナー |
| `getApproved` | tokenId | address | 5分 | 承認されたアドレス |
| `getTokenCreator` | tokenId | address | 24時間 | トークンクリエーター |
| `_originalTokenInfo` | tokenId | string | 1時間 | オリジナルトークン情報 |
| `_sbtFlag` | tokenId | bool | 1時間 | SBTフラグ |
| `tokenByIndex` | tokenId | uint256 | 5分 | インデックス別トークン |
| `royalties` | tokenId | (address,uint16) | 24時間 | ロイヤリティ情報 |

**使用例:**
```bash
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/getTokenCreator?tokenId=1"
# レスポンス: {"result":"0x5A636bdaB39414DE26735f8CDf6dded8b5bcA0e2","cached":false}

curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/tokenURI?tokenId=1"
```

#### アドレス系関数（6個）

| 関数名 | パラメータ | 戻り値型 | キャッシュ期間 | 説明 |
|--------|------------|----------|----------------|------|
| `balanceOf` | address | uint256 | 1分 | アドレスのトークン残高 |
| `_importers` | address | bool | 1時間 | インポーター権限 |
| `_totalDonations` | address | uint256 | 5分 | 総寄付額 |
| `getCreatorName` | address | string | 1時間 | クリエーター名 |
| `getCreatorTokenCount` | address | uint256 | 5分 | クリエーターのトークン数 |
| `getCreatorTokens` | address | uint256[] | 5分 | クリエーターのトークン一覧 |

**使用例:**
```bash
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/getCreatorTokenCount?address=0x5A636bdaB39414DE26735f8CDf6dded8b5bcA0e2"
# レスポンス: {"result":"18","cached":false}

curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/getCreatorName?address=0x5A636bdaB39414DE26735f8CDf6dded8b5bcA0e2"
# レスポンス: {"result":"","cached":false}
```

#### 複数パラメータ関数（3個）

| 関数名 | パラメータ | 戻り値型 | キャッシュ期間 | 説明 |
|--------|------------|----------|----------------|------|
| `isApprovedForAll` | owner, operator | bool | 5分 | 全承認状態 |
| `royaltyInfo` | tokenId, salePrice | (address,uint256) | 24時間 | ロイヤリティ計算 |
| `tokenOfOwnerByIndex` | owner, index | uint256 | 1分 | オーナー別トークン |

**使用例:**
```bash
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/isApprovedForAll?owner=0x123...&operator=0x456..."

curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/royaltyInfo?tokenId=1&salePrice=1000000000000000000"
```

#### その他関数（1個）

| 関数名 | パラメータ | 戻り値型 | キャッシュ期間 | 説明 |
|--------|------------|----------|----------------|------|
| `supportsInterface` | interfaceId | bool | 24時間 | インターフェース対応状況 |

**使用例:**
```bash
curl -X GET "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/supportsInterface?interfaceId=0x80ac58cd"
```

## レスポンス形式

### 成功レスポンス
```json
{
  "result": "値またはオブジェクト",
  "cached": true|false,
  "cachedAt": "2025-06-24T06:22:40.870Z"
}
```

### エラーレスポンス
```json
{
  "error": "エラータイプ",
  "message": "詳細なエラーメッセージ"
}
```

#### 一般的なエラー
- `Contract not whitelisted`: 未承認コントラクト
- `Unsupported function`: 未対応関数
- `Failed to fetch data`: RPC呼び出し失敗
- `Missing Authentication Token`: APIキー不足（開発環境）

## キャッシュ戦略

### キャッシュ期間の設計思想
- **24時間**: 不変または極めて稀に変更される値（name, symbol, インターフェース対応など）
- **1時間**: 管理者設定や設定値（_mintFee, _maxFeeRate, メタデータなど）
- **5分**: トークン移転や作成で変更される値（ownerOf, totalSupply, クリエーター情報など）
- **1分**: 頻繁に変更される値（balanceOf, 承認状態など）

### キャッシュクリア
POSTリクエストで同一関数を呼び出すとキャッシュを強制更新できます：
```bash
curl -X POST "https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod/contract/0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7/totalSupply"
```

## 制限事項

### 対応コントラクト
現在はホワイトリスト方式で以下のコントラクトのみ対応：
- **Polygon**: `0xDaB98a9D823b8152A33AAA9292fEf0aE7C2fE4b7` (BizenNFT)

### パフォーマンス制限
- RPC タイムアウト: 5秒
- レスポンスサイズ制限: 制限なし（DynamoDB 400KB制限内）
- レート制限: なし（パブリックアクセス時）

## 技術仕様

### アーキテクチャ
- **API Gateway**: RESTエンドポイント
- **Lambda**: Node.js 20.x, ARM64アーキテクチャ
- **DynamoDB**: キャッシュストレージ（TTL付き）
- **EventBridge**: 定期監視（5分間隔）

### 環境
- **プロダクション**: パブリックアクセス、Polygonチェーン
- **開発**: APIキー認証、Ethereumメインネット

### デプロイ
```bash
# プロダクション環境
./deploy.sh production

# 開発環境  
./deploy.sh local
```

## バージョン履歴

### v1.0.0 (2025-06-24)
- 25個のview関数対応
- パブリックアクセス対応
- 環境別認証設定
- BizenNFT (Polygon) 対応
- 包括的なキャッシュ戦略実装
