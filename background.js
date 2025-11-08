// 拡張機能アイコンがクリックされたときにサイドパネルを開く
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 拡張機能がインストールされたときの処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chrome to X 拡張機能がインストールされました');
});

// サイドパネルからタブ情報を取得するためのメッセージハンドラ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] メッセージ受信:', request);
  
  if (request.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        sendResponse({ tab: tabs[0] });
      } else {
        sendResponse({ tab: null });
      }
    });
    return true; // 非同期レスポンス用
  }
  
  if (request.action === 'pasteToActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) {
        console.error('[Background] アクティブなタブが見つかりません');
        sendResponse({ success: false, error: 'アクティブなタブが見つかりません' });
        return;
      }
      
      const tab = tabs[0];
      console.log('[Background] タブにメッセージを送信:', tab.id, tab.url);
      
      try {
        // まず、content scriptが読み込まれているか確認し、なければ注入
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return typeof window.pasteContent === 'function';
          }
        });
        
        const isContentScriptLoaded = results && results[0] && results[0].result;
        
        if (!isContentScriptLoaded) {
          // content scriptを注入
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
          });
          // 注入後に少し待つ
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // pasteContentを直接呼び出す
        const pasteResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (text, images) => {
            if (typeof window.pasteContent === 'function') {
              return window.pasteContent(text, images);
            } else {
              throw new Error('pasteContent function not found');
            }
          },
          args: [request.text, request.images]
        });
        
        sendResponse({ success: true });
      } catch (error) {
        console.error('[Background] スクリプト実行エラー:', error);
        sendResponse({ 
          success: false, 
          error: error.message,
          details: 'ページへの貼り付けに失敗しました'
        });
      }
    });
    return true; // 非同期レスポンス用
  }
  
  if (request.action === 'captureScreenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) {
        console.error('[Background] アクティブなタブが見つかりません');
        sendResponse({ success: false, error: 'アクティブなタブが見つかりません' });
        return;
      }
      
      const tab = tabs[0];
      console.log('[Background] スクリーンショット取得開始:', tab.id);
      
      try {
        // 現在のタブのスクリーンショットを取得
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: 'png'
        });
        
        console.log('[Background] スクリーンショット取得成功');
        sendResponse({ success: true, dataUrl: dataUrl });
      } catch (error) {
        console.error('[Background] スクリーンショット取得エラー:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'スクリーンショットの取得に失敗しました'
        });
      }
    });
    return true; // 非同期レスポンス用
  }
  
  if (request.action === 'startSelectionScreenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) {
        console.error('[Background] アクティブなタブが見つかりません');
        sendResponse({ success: false, error: 'アクティブなタブが見つかりません' });
        return;
      }
      
      const tab = tabs[0];
      console.log('[Background] 選択範囲スクリーンショット開始:', tab.id);
      
      try {
        // content scriptが読み込まれているか確認し、なければ注入
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return typeof window.startSelectionScreenshot === 'function';
          }
        });
        
        const isContentScriptLoaded = results && results[0] && results[0].result;
        
        if (!isContentScriptLoaded) {
          // content scriptを注入
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
          });
          // 注入後に少し待つ
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // content scriptに選択範囲を指定してもらう
        const selectionResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return new Promise((resolve, reject) => {
              if (typeof window.startSelectionScreenshot === 'function') {
                window.startSelectionScreenshot().then(resolve).catch(reject);
              } else {
                // メッセージ経由で呼び出す
                chrome.runtime.sendMessage({ action: 'startSelectionScreenshot' }, (response) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else if (response && response.success) {
                    resolve(response.selection);
                  } else {
                    reject(new Error(response?.error || '選択範囲の取得に失敗しました'));
                  }
                });
              }
            });
          }
        });
        
        const selection = selectionResults && selectionResults[0] && selectionResults[0].result;
        
        if (selection) {
          console.log('[Background] 選択範囲を取得:', selection);
          sendResponse({ success: true, selection: selection });
        } else {
          sendResponse({ success: false, error: '選択範囲を取得できませんでした' });
        }
      } catch (error) {
        console.error('[Background] 選択範囲スクリーンショットエラー:', error);
        sendResponse({ 
          success: false, 
          error: error.message || '選択範囲の取得に失敗しました'
        });
      }
    });
    return true; // 非同期レスポンス用
  }
  
  if (request.action === 'captureSelectScreenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) {
        console.error('[Background] アクティブなタブが見つかりません');
        sendResponse({ success: false, error: 'アクティブなタブが見つかりません' });
        return;
      }
      
      const tab = tabs[0];
      const selection = request.selection;
      console.log('[Background] 選択範囲スクリーンショット取得開始:', tab.id, selection);
      
      try {
        // 現在のタブのスクリーンショットを取得
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: 'png'
        });
        
        // 選択範囲を切り抜く（background scriptではできないので、sidepanelで処理）
        // ここではスクリーンショットと選択範囲の情報を返す
        console.log('[Background] スクリーンショット取得成功');
        sendResponse({ success: true, dataUrl: dataUrl, selection: selection });
      } catch (error) {
        console.error('[Background] スクリーンショット取得エラー:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'スクリーンショットの取得に失敗しました'
        });
      }
    });
    return true; // 非同期レスポンス用
  }
  
  if (request.action === 'fetchImage') {
    console.log('[Background] 画像取得開始:', request.url);
    
    (async () => {
      try {
        // クロスオリジンの画像を取得（background scriptはCORS制限を受けない）
        const response = await fetch(request.url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Service WorkerではFileReaderが使えないため、ArrayBuffer経由でBase64に変換
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const dataUrl = `data:${blob.type || 'image/png'};base64,${base64}`;
        
        console.log('[Background] 画像取得成功');
        sendResponse({ success: true, base64: dataUrl });
      } catch (error) {
        console.error('[Background] 画像取得エラー:', error);
        sendResponse({ 
          success: false, 
          error: error.message || '画像の取得に失敗しました'
        });
      }
    })();
    return true; // 非同期レスポンス用
  }

  if (request.action === 'claudeChat') {
    handleClaudeChat(request.payload)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error('[Background] Claudeチャットエラー:', error);
        sendResponse({
          success: false,
          error: error.message || 'Claude APIの呼び出しに失敗しました',
          status: error.status || null,
          details: error.details || null
        });
      });
    return true; // 非同期レスポンス用
  }
});

// ArrayBufferをBase64に変換
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';
const CLAUDE_DEFAULT_MODEL = 'claude-sonnet-4-5';
const CLAUDE_MAX_TOKENS = 1024;
const SUPPORTED_MODELS = new Set(['claude-sonnet-4-5', 'claude-haiku-4-5']);

async function handleClaudeChat(payload) {
  if (!payload || !Array.isArray(payload.messages)) {
    return {
      success: false,
      error: '不正なリクエストです'
    };
  }

  const apiKey = await getClaudeApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: 'Claude APIキーが設定されていません'
    };
  }

  try {
    const response = await callClaudeApi({
      apiKey,
      instructions: payload.instructions,
      messages: payload.messages,
      model: SUPPORTED_MODELS.has(payload.model) ? payload.model : CLAUDE_DEFAULT_MODEL
    });

    return {
      success: true,
      message: response.text,
      usage: response.usage || null
    };
  } catch (error) {
    throw error;
  }
}

async function callClaudeApi({ apiKey, instructions, messages, model }) {
  const requestBody = buildClaudeRequestBody({ instructions, messages, model });

  const response = await fetch(CLAUDE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const status = response.status;
    const rawError = await response.text();
    let message = `Claude API error: ${status}`;
    let details = null;

    try {
      const parsed = JSON.parse(rawError);
      message = parsed?.error?.message || message;
      details = parsed;
    } catch (parseError) {
      details = rawError;
    }

    throw {
      status,
      message,
      details
    };
  }

  const data = await response.json();
  const text = extractClaudeText(data);
  return {
    text,
    usage: data?.usage
  };
}

function buildClaudeRequestBody({ instructions, messages, model }) {
  const formattedMessages = messages
    .filter((message) => message?.role && message?.content)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: [
        {
          type: 'text',
          text: String(message.content || '')
        }
      ]
    }));

  const body = {
    model: SUPPORTED_MODELS.has(model) ? model : CLAUDE_DEFAULT_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: formattedMessages
  };

  if (instructions) {
    body.system = instructions;
  }

  return body;
}

function extractClaudeText(responseData) {
  if (!responseData) return '';
  if (Array.isArray(responseData?.content)) {
    return responseData.content
      .map((item) => (item?.text ? item.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  return '';
}

async function getClaudeApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['claudeApiKey'], (result) => {
      resolve(result?.claudeApiKey || '');
    });
  });
}
