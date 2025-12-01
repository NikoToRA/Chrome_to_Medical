# 緊急回避策 - 今すぐ動かす方法

**状況**: 新しいコードがデプロイされない（キャッシュ問題）

---

## 🚨 問題

- 新しいコードをデプロイしても、古いコードが実行され続ける
- Azure Functions のキャッシュ問題
- `content-length: 0` = 古いコードが実行されている証拠

---

## ✅ 緊急回避策

### 方法1: 古いコードのまま、直接Stripe Checkoutのフローを構築

古いコードは401を返すだけですが、**成功フローは動作するはず**です。

#### ステップ1: LPを修正して、直接Stripe Checkoutに進むように変更

`landing-page/src/utils/api.js`を編集：

```javascript
// sendMagicLink の代わりに、直接create-checkout-sessionを呼び出す
export async function registerDirectCheckout(formData) {
    const returnUrl = `${window.location.origin}/success`;
    
    const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            returnUrl
        })
    });
    
    if (!response.ok) {
        throw new Error('チェックアウトセッションの作成に失敗しました');
    }
    
    const data = await response.json();
    return data; // { url: 'https://checkout.stripe.com/...' }
}
```

#### ステップ2: RegisterPage.jsxを修正

```javascript
const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        const { url } = await registerDirectCheckout(formData);
        // Stripe Checkoutにリダイレクト
        window.location.href = url;
    } catch (err) {
        setError(err.message);
        setLoading(false);
    }
};
```

---

### 方法2: Azure Portalから直接ファイルを確認・編集

1. Azure Portal → Function App → **開発ツール** → **高度なツール (Kudu)**
2. **Debug console** → **CMD**
3. `site/wwwroot/auth-verify-token/` に移動
4. `index.js` を開いて、コードを確認
5. 必要であれば、直接編集して保存

---

### 方法3: ローカルでテストして問題を切り分け

```bash
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func start
```

ローカルで起動して、`http://localhost:7071/api/auth-verify-token?token=xxx` でテストします。

---

## 🎯 最も確実な方法

**Azure Function Appを完全に削除して再作成**

これは最終手段ですが、キャッシュ問題を完全に解決できます。

```bash
# 1. Function Appを削除
az functionapp delete \
  --name func-karte-ai-1763705952 \
  --resource-group rg-karte-ai

# 2. 新しいFunction Appを作成
az functionapp create \
  --name func-karte-ai-new \
  --storage-account stkarteai1763705952 \
  --resource-group rg-karte-ai \
  --consumption-plan-location japaneast \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4

# 3. 環境変数を設定
# （すべての環境変数を再設定）

# 4. デプロイ
cd /Users/suguruhirayama/Chrome_to_Medical/azure-functions
func azure functionapp publish func-karte-ai-new
```

---

**作成者**: AI Assistant  
**最終更新**: 2025-11-30

