# ESSC Platform - 体験型広告プラットフォーム

メーカー・施設・消費者をつなぐ体験型広告プラットフォームのMVPアプリケーションです。

## 🎯 プロジェクト概要

### ビジネスモデル
- **メーカー**: アメニティ等の商品を原価+送料で施設へ提供
- **施設**: 無料/原価で高品質な商品を導入し、顧客満足度を向上
- **消費者**: 実際に使用して気に入った商品をQRコードから購入
- **ESSC**: マッチング・トラッキング・レポート・決済を提供

### 主要機能
1. **メーカー機能**
   - 商品登録・管理
   - キャンペーン作成
   - パフォーマンスレポート閲覧

2. **施設機能**
   - キャンペーン応募
   - 商品配置・在庫管理
   - QRコード生成

3. **消費者機能**
   - QRコードから商品ランディングページ閲覧
   - EC購入への遷移

4. **管理者機能**
   - アカウント審査
   - 商品・キャンペーン承認
   - 全体ダッシュボード

## 🛠 技術スタック

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: SQLite (開発環境) / PostgreSQL (本番推奨) + Prisma ORM 6.19.0
- **Authentication**: bcryptjs + localStorage (JWT実装予定)
- **Validation**: Zod

## 📦 セットアップ

### 前提条件
- Node.js 18以上
- SQLite (開発環境、自動セットアップ)
- PostgreSQL 14以上 (本番環境推奨)

### インストール手順

1. **依存パッケージのインストール**
```bash
npm install
```

2. **環境変数の設定**
`.env`ファイルを作成（開発環境用、既に設定済み）:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

**本番環境用（PostgreSQL）**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/essc_prod?schema=public"
```

3. **データベースのセットアップ**

Prisma Clientを生成:
```bash
npx prisma generate
```

データベースをプッシュ（スキーマ適用）:
```bash
npx prisma db push
```

テストデータをシード（オプション）:
```bash
npx ts-node scripts/seed.ts
```

4. **開発サーバーの起動**
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 📊 データベース設計

### 主要テーブル
- `users`: ユーザー認証情報
- `manufacturers`: メーカープロフィール
- `facilities`: 施設プロフィール
- `products`: 商品マスタ
- `campaigns`: キャンペーン情報
- `facility_campaigns`: 施設のキャンペーン参加
- `facility_product_placements`: 商品配置・在庫
- `qr_codes`: QRコード
- `qr_scan_events`: スキャンログ
- `click_events`: クリックログ
- `purchase_events`: 購入ログ

詳細なスキーマは `prisma/schema.prisma` を参照してください。

## 🚀 使い方

### 1. ユーザー登録
- トップページから「メーカーとして登録」または「施設として登録」をクリック
- 必要情報を入力して登録
- 管理者による承認を待つ

### 2. ログイン
- メールアドレスとパスワードでログイン
- ロールに応じたダッシュボードが表示される

### 3. メーカーの場合
1. 商品を登録
2. キャンペーンを作成
3. 施設からの応募を承認
4. レポートでパフォーマンスを確認

### 4. 施設の場合
1. キャンペーン一覧から応募
2. 承認されたら商品を配置
3. QRコードを生成・設置
4. 在庫を管理

### 5. 消費者の場合
- 施設に設置されたQRコードをスキャン
- 商品情報を閲覧
- 「購入する」ボタンからECサイトへ遷移

### 6. 管理者の場合（✅ 実装済み）
1. **承認管理** (`/dashboard/approvals`)
   - アカウント承認（メーカー・施設）
   - 商品承認
   - キャンペーン承認
   - 却下理由の入力
   - 処理履歴の確認

2. **全体分析** (`/dashboard/analytics`)
   - KPI表示（ユーザー数、商品数、キャンペーン数、スキャン数）
   - コンバージョン率分析
   - 売上統計
   - トップパフォーマー表示
   - 月次トレンド分析

**テストアカウント**:
- Email: `admin@essc.local`
- Password: `admin123`

## 🗄 Prisma Studio

データベースをGUIで確認・編集:
```bash
npx prisma studio
```

http://localhost:5555 でPrisma Studioが起動します。

## 📝 API エンドポイント

### 認証
- `POST /api/auth/signup` - 新規登録
- `POST /api/auth/login` - ログイン

### 管理者機能（✅ 実装済み）
- `GET /api/admin/approvals/accounts` - アカウント承認待ちリスト取得
- `POST /api/admin/approvals/accounts` - アカウント承認/却下
- `GET /api/admin/approvals/products` - 商品承認待ちリスト取得
- `POST /api/admin/approvals/products` - 商品承認/却下
- `GET /api/admin/approvals/campaigns` - キャンペーン承認待ちリスト取得
- `POST /api/admin/approvals/campaigns` - キャンペーン承認/却下
- `GET /api/admin/analytics` - 全体統計データ取得

### 今後実装予定
- `GET /api/products` - 商品一覧取得
- `POST /api/products` - 商品登録
- `GET /api/campaigns` - キャンペーン一覧
- `POST /api/campaigns` - キャンペーン作成
- `POST /api/facility-campaigns` - キャンペーン応募
- `POST /api/qrcodes` - QRコード生成
- `POST /api/events/scan` - スキャンイベント記録
- `POST /api/events/click` - クリックイベント記録

## 🔐 セキュリティ

### 実装済み
- パスワードのハッシュ化（bcrypt）
- ログイン試行回数制限（5回でロック）
- アカウントロック機能（30分間）

### 今後実装予定
- JWT認証
- CSRF保護
- Rate Limiting
- Row Level Security (RLS)

## 🧪 テスト

```bash
# テストの実行（実装予定）
npm test
```

## 📦 ビルド

```bash
# 本番用ビルド
npm run build

# 本番サーバー起動
npm start
```

## 🚧 開発ロードマップ

### Phase 1: MVP Core（完了）
- [x] 認証システム
- [x] ユーザー登録（メーカー・施設）
- [x] 基本的なダッシュボード

### Phase 2: コア機能（進行中）
- [ ] 商品管理CRUD
- [ ] キャンペーン作成
- [ ] 施設のキャンペーン応募
- [ ] QRコード生成
- [ ] 商品ランディングページ

### Phase 3: トラッキング
- [ ] QRスキャンイベント記録
- [ ] クリックイベント記録
- [ ] 基本レポート機能

### Phase 4: 管理者機能（✅ 完了）
- [x] アカウント承認フロー
- [x] 商品・キャンペーン承認
- [x] 全体ダッシュボード（KPI・分析）

### Phase 5: 高度な機能
- [ ] 購入イベント連携（Webhook）
- [ ] 詳細レポート・分析
- [ ] 請求書生成
- [ ] レビュー機能

## 📄 ライセンス

Proprietary - ESSC Platform

## 👥 チーム

開発: ESSC Development Team

## 📞 サポート

問い合わせ: support@essc-platform.com
