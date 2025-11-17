# クイックセットアップガイド

## 🚀 5分で起動する手順

### 1. PostgreSQLの起動

#### Dockerを使う場合（推奨）
```bash
docker run --name essc-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=essc_dev \
  -p 5432:5432 \
  -d postgres:14
```

#### macOS (Homebrew)
```bash
brew services start postgresql@14
createdb essc_dev
```

#### Linux
```bash
sudo systemctl start postgresql
sudo -u postgres createdb essc_dev
```

### 2. 環境変数の確認

`.env`ファイルが正しく設定されているか確認:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/essc_dev?schema=public"
```

### 3. データベースのマイグレーション

```bash
npm run db:migrate
```

これにより:
- データベーステーブルが作成されます
- Prisma Clientが自動生成されます

### 4. サンプルデータの投入

```bash
npm run db:seed
```

これにより以下のユーザーが作成されます:

| 役割 | メール | パスワード |
|------|--------|-----------|
| 管理者 | admin@essc.local | admin123 |
| メーカー | manufacturer@example.com | password123 |
| 施設 | facility@example.com | password123 |

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

## ✅ 動作確認

1. **トップページ**: http://localhost:3000
2. **ログイン**: http://localhost:3000/login
   - `manufacturer@example.com` / `password123` でログイン
3. **ダッシュボード**: http://localhost:3000/dashboard
   - メーカーのダッシュボードが表示されます

## 🛠 開発ツール

### Prisma Studio（データベースGUI）
```bash
npm run db:studio
```
http://localhost:5555 でデータベースを視覚的に操作できます

### データベースのリセット
```bash
npx prisma migrate reset
npm run db:seed
```

## 🐛 トラブルシューティング

### エラー: "Can't reach database server"
- PostgreSQLが起動しているか確認
- `.env`のDATABASE_URLが正しいか確認

### エラー: "Prisma schema file not found"
```bash
npm run db:generate
```

### エラー: "Module not found: Can't resolve '@prisma/client'"
```bash
npm install
npm run db:generate
```

### ポート3000が既に使用されている
```bash
# ポート番号を変更して起動
PORT=3001 npm run dev
```

## 📚 次のステップ

1. **商品登録機能の実装**
   - `/app/dashboard/products` ディレクトリを作成
   - 商品CRUDのAPIとUIを実装

2. **キャンペーン機能の実装**
   - `/app/dashboard/campaigns` ディレクトリを作成
   - キャンペーン作成・管理機能を実装

3. **QRコード生成機能**
   - `qrcode` パッケージをインストール
   - QRコード生成APIを実装

4. **商品ランディングページ**
   - `/app/p/[productId]` ルートを作成
   - トラッキング機能を実装

## 🔗 関連リンク

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Prisma ドキュメント](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
