# キャンペーン数が2と表示される問題の調査

## 確認が必要な情報

1. **正確なページURL**
   - どのページで「キャンペーン数: 2」と表示されていますか？
   - 例: `/dashboard/approvals`, `/dashboard/admin/master`, など

2. **表示されている場所**
   - テーブルの列ですか？
   - カードの統計情報ですか？
   - 商品詳細ページですか？

## ブラウザで確認する方法

該当ページを開いて、ブラウザのコンソール（Command + Option + J）で以下を実行：

```javascript
// 現在のページURLを確認
console.log('Current URL:', window.location.href);

// ページ内の「2」という数字を探す
document.body.innerText.match(/キャンペーン.*2/g);

// APIレスポンスを確認（ネットワークタブ）
// 1. DevTools > Network タブ
// 2. ページをリロード
// 3. "products" や "campaigns" を含むリクエストをクリック
// 4. Response を確認
```

## 考えられる箇所

1. `/api/admin/approvals/products` - 商品の承認一覧
2. `/api/manufacturer/stats` - メーカー統計
3. `/api/admin/dashboard` - 管理者ダッシュボード
4. カスタムの商品管理画面

URLまたはスクリーンショットを共有していただければ、正確に特定できます。
