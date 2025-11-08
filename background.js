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
});
