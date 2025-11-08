// オプションページのロジック

const claudeApiKeyInput = document.getElementById('claudeApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

// 初期化
async function init() {
  const apiKey = await StorageManager.get('claudeApiKey', '');
  claudeApiKeyInput.value = apiKey;
  
  saveApiKeyBtn.addEventListener('click', async () => {
    await saveApiKey();
  });
}

// APIキーの保存
async function saveApiKey() {
  const apiKey = claudeApiKeyInput.value.trim();
  await StorageManager.set('claudeApiKey', apiKey);
  alert('APIキーを保存しました');
}

// StorageManagerを読み込む
const script = document.createElement('script');
script.src = '/utils/storage.js';
document.head.appendChild(script);

script.onload = () => {
  init();
};

