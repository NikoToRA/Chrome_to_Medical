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
