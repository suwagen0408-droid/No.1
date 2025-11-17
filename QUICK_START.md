# ⚡ クイックスタート - 3ステップで起動

## 📋 必要なもの
- Node.js 18+
- PostgreSQL 14+（または Docker）

---

## 🚀 3ステップセットアップ

### Step 1: PostgreSQL起動
```bash
# Dockerを使う場合（推奨）
docker-compose up -d

# または、既存のPostgreSQLを使う場合
createdb essc_dev
```

### Step 2: データベース初期化
```bash
npm install           # 依存関係インストール
npm run db:migrate    # テーブル作成
npm run db:seed       # サンプルデータ投入
```

### Step 3: 起動
```bash
npm run dev
```

**完了！** http://localhost:3000 にアクセス

---

## 🔑 テストログイン

| ロール | メール | パスワード |
|--------|--------|-----------|
| メーカー | manufacturer@example.com | password123 |
| 施設 | facility@example.com | password123 |
| 管理者 | admin@essc.local | admin123 |

---

## 📱 画面フロー

```
トップページ (/)
    ↓
新規登録 (/signup)
    ↓
【管理者承認待ち】
    ↓
ログイン (/login)
    ↓
ダッシュボード (/dashboard)
```

---

## 🛠 よく使うコマンド

```bash
npm run dev              # 開発サーバー起動
npm run db:studio        # データベースGUI（:5555）
npm run db:migrate       # マイグレーション実行
npm run db:seed          # サンプルデータ再投入

npx prisma migrate reset # データベース全削除＆再作成
```

---

## 🐛 困ったときは

### エラー: "Can't reach database server"
```bash
# PostgreSQLが起動しているか確認
docker ps  # Dockerの場合

# または
brew services list  # Homebrewの場合
```

### エラー: "Module not found: @prisma/client"
```bash
npm run db:generate
```

### ポート3000が使われている
```bash
# 別のポートで起動
PORT=3001 npm run dev
```

---

## 📖 詳細ドキュメント

- **完全セットアップ**: `SETUP.md`
- **実装状況**: `PROJECT_STATUS.md`
- **納品サマリー**: `DELIVERY_SUMMARY.md`
- **プロジェクト概要**: `README.md`

---

## ✅ 動作確認チェックリスト

- [ ] トップページが表示される
- [ ] 新規登録ができる（メーカー/施設）
- [ ] ログインができる
- [ ] ダッシュボードが表示される
- [ ] ログアウトができる
- [ ] Prisma Studioでデータが見える

---

**すぐに始められます！** 🎉
