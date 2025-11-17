# 📖 ESSC Platform - ドキュメント索引

## 🚀 すぐに始めたい方
**→ [QUICK_START.md](./QUICK_START.md)**
- 3ステップで起動できます
- PostgreSQL + マイグレーション + 起動

## 📚 ドキュメント一覧

### 1️⃣ 初めての方向け

#### [QUICK_START.md](./QUICK_START.md) ⚡
- **内容**: 3ステップクイックスタート
- **所要時間**: 5分
- **こんな方に**: すぐに動かしたい

#### [README.md](./README.md) 📋
- **内容**: プロジェクト概要・技術スタック
- **所要時間**: 5分
- **こんな方に**: プロジェクト全体を把握したい

### 2️⃣ セットアップする方向け

#### [SETUP.md](./SETUP.md) 🛠
- **内容**: 詳細なセットアップ手順
- **所要時間**: 10分
- **こんな方に**: 環境構築を丁寧に進めたい
- **含まれる内容**:
  - PostgreSQL各種インストール方法
  - トラブルシューティング
  - 開発ツールの使い方

### 3️⃣ 開発する方向け

#### [PROJECT_STATUS.md](./PROJECT_STATUS.md) 📊
- **内容**: 実装状況・次のステップ
- **所要時間**: 10分
- **こんな方に**: 何が完成していて何が未実装か知りたい
- **含まれる内容**:
  - 完成した機能リスト
  - 未実装機能リスト
  - 優先度付き実装ガイド
  - ファイル構造

#### [ARCHITECTURE.md](./ARCHITECTURE.md) 🏛
- **内容**: システムアーキテクチャ
- **所要時間**: 15分
- **こんな方に**: 技術設計を理解したい
- **含まれる内容**:
  - システム全体図
  - データフロー図
  - ER図
  - 技術スタック詳細
  - ディレクトリ構成

### 4️⃣ PM/クライアント向け

#### [DELIVERY_SUMMARY.md](./DELIVERY_SUMMARY.md) 📦
- **内容**: 納品サマリー・完成度評価
- **所要時間**: 15分
- **こんな方に**: プロジェクトの完成度を確認したい
- **含まれる内容**:
  - 実装済み機能の詳細
  - APIエンドポイント仕様
  - テストアカウント
  - 次の開発フェーズ
  - セキュリティ実装状況

### 5️⃣ QAテスター向け

#### [FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md) ✅
- **内容**: 最終チェックリスト・テスト手順
- **所要時間**: 20分
- **こんな方に**: 動作確認・テストを実施したい
- **含まれる内容**:
  - 機能別チェックリスト
  - 動作確認手順（詳細）
  - APIテストコマンド
  - ブラウザテストシナリオ
  - トラブルシューティング

---

## 📂 ディレクトリ構造

```
essc-platform/
│
├── 📖 ドキュメント
│   ├── INDEX.md                    # このファイル（索引）
│   ├── QUICK_START.md             # 3ステップ起動
│   ├── README.md                  # プロジェクト概要
│   ├── SETUP.md                   # 詳細セットアップ
│   ├── PROJECT_STATUS.md          # 実装状況
│   ├── ARCHITECTURE.md            # アーキテクチャ
│   ├── DELIVERY_SUMMARY.md        # 納品サマリー
│   └── FINAL_CHECKLIST.md         # チェックリスト
│
├── 🎨 Frontend
│   └── app/
│       ├── page.tsx              # ランディングページ
│       ├── login/                # ログイン
│       ├── signup/               # 新規登録
│       └── dashboard/            # ダッシュボード
│
├── 🔌 Backend
│   └── app/api/
│       └── auth/
│           ├── signup/           # 登録API
│           └── login/            # ログインAPI
│
├── 🗄 Database
│   ├── prisma/
│   │   └── schema.prisma        # スキーマ（26テーブル）
│   └── scripts/
│       └── seed.ts              # シードデータ
│
└── ⚙️ 設定
    ├── package.json             # 依存関係
    ├── tsconfig.json            # TypeScript
    ├── docker-compose.yml       # PostgreSQL
    └── .env                     # 環境変数
```

---

## 🎯 ユースケース別ガイド

### 「今すぐ動かしたい」
```bash
# 1. 索引を確認（このファイル）
cat INDEX.md

# 2. クイックスタート
cat QUICK_START.md

# 3. 実行
docker-compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

### 「開発に参加したい」
1. [QUICK_START.md](./QUICK_START.md) - 起動
2. [PROJECT_STATUS.md](./PROJECT_STATUS.md) - 実装状況確認
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ理解
4. コーディング開始

### 「機能仕様を確認したい」
1. [DELIVERY_SUMMARY.md](./DELIVERY_SUMMARY.md) - 実装済み機能
2. [PROJECT_STATUS.md](./PROJECT_STATUS.md) - 未実装機能
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - 技術設計

### 「テストしたい」
1. [QUICK_START.md](./QUICK_START.md) - 起動
2. [FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md) - テスト手順
3. [DELIVERY_SUMMARY.md](./DELIVERY_SUMMARY.md) - テストアカウント

### 「トラブル解決したい」
1. [SETUP.md](./SETUP.md) - トラブルシューティング
2. [FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md) - エラー解決方法

---

## 🔑 重要情報クイックリファレンス

### テストアカウント
```
メーカー:  manufacturer@example.com / password123
施設:      facility@example.com / password123
管理者:    admin@essc.local / admin123
```

### よく使うコマンド
```bash
npm run dev          # 開発サーバー起動
npm run db:studio    # データベースGUI
npm run db:migrate   # マイグレーション
npm run db:seed      # サンプルデータ投入
```

### アクセスURL
```
アプリ:      http://localhost:3000
DB Studio:   http://localhost:5555
PostgreSQL:  localhost:5432
```

---

## 📊 実装完了度

```
基盤構築    [████████████] 100%
認証        [████████████] 100%
UI          [████████████] 100%
コア機能    [░░░░░░░░░░░░]   0%
─────────────────────────────
総合        [████░░░░░░░░]  20%
```

---

## 🎓 学習パス

### 初心者向け
1. [README.md](./README.md) - プロジェクト概要を理解
2. [QUICK_START.md](./QUICK_START.md) - 実際に動かしてみる
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - 全体設計を把握
4. コードを読む（`app/`ディレクトリから）

### 中級者向け
1. [PROJECT_STATUS.md](./PROJECT_STATUS.md) - 実装状況確認
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - 詳細設計理解
3. [DELIVERY_SUMMARY.md](./DELIVERY_SUMMARY.md) - API仕様確認
4. 未実装機能の開発開始

### 上級者向け
1. 全ドキュメントレビュー
2. データベース設計最適化
3. アーキテクチャ改善提案
4. 次のフェーズ設計

---

## 💡 Tips

### 効率的な読み方
- **最初に読む**: INDEX.md（このファイル）→ QUICK_START.md
- **開発前に読む**: PROJECT_STATUS.md → ARCHITECTURE.md
- **問題発生時**: SETUP.md → FINAL_CHECKLIST.md

### ドキュメント更新ルール
- 機能追加時: PROJECT_STATUS.md を更新
- API追加時: DELIVERY_SUMMARY.md を更新
- 設計変更時: ARCHITECTURE.md を更新

---

## 📞 サポート

**開発チーム**: development@essc-platform.com  
**プロジェクト**: ESSC Platform MVP  
**バージョン**: 0.1.0  
**最終更新**: 2024年11月16日

---

## ⭐ おすすめの読み方

### 🚀 「5分で理解したい」
1. このファイル（INDEX.md）
2. [QUICK_START.md](./QUICK_START.md)

### 📖 「30分でマスターしたい」
1. [README.md](./README.md) - 5分
2. [QUICK_START.md](./QUICK_START.md) - 5分（実際に起動）
3. [PROJECT_STATUS.md](./PROJECT_STATUS.md) - 10分
4. [ARCHITECTURE.md](./ARCHITECTURE.md) - 10分

### 🎯 「完璧に把握したい」
1. 全ドキュメント順番に読む（約60分）
2. 実際に起動してテスト
3. コードを読む
4. Prisma Studioでデータ確認

---

**それでは、開発を始めましょう！** 🎉

```bash
npm run dev
```
