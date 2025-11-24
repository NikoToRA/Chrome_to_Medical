// 拡張機能アイコンがクリックされたときにサイドパネルを開く
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 拡張機能がインストールされたときの処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('KarteAI+ 拡張機能がインストールされました');
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
      console.log('[Background] タブにメッセージを送信:', tab.id, tab.url, 'text length:', request.text?.length);
      
      try {
        // まず、content scriptが読み込まれているか確認し、なければ注入
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return typeof window.pasteContent === 'function';
          }
        });
        
        const isContentScriptLoaded = results && results[0] && results[0].result;
        console.log('[Background] Content script loaded:', isContentScriptLoaded);
        
        if (!isContentScriptLoaded) {
          console.log('[Background] Content scriptを注入します');
          // プラットフォームハンドラーとcontent scriptを注入（manifest.jsonと同じ順序）
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'content/platforms/clinics.js',
              'content/platforms/default.js',
              'content/platforms/x.js',
              'content/platforms/facebook.js',
              'content/platforms/google-docs.js',
              'content/content.js'
            ]
          });
          // 注入後に少し待つ（プラットフォームハンドラーの初期化を待つ）
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log('[Background] Content script注入完了');
        }
        
        // pasteContentを直接呼び出す
        console.log('[Background] pasteContentを呼び出します');
        const pasteResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (text, images) => {
            console.log('[Background->Content] pasteContent呼び出し開始:', { textLength: text?.length, imagesCount: images?.length });
            try {
              if (typeof window.pasteContent === 'function') {
                const result = await window.pasteContent(text, images || []);
                console.log('[Background->Content] pasteContent結果:', result);
                return result;
              } else {
                console.error('[Background->Content] pasteContent function not found');
                throw new Error('pasteContent function not found');
              }
            } catch (error) {
              console.error('[Background->Content] pasteContent実行エラー:', error);
              throw error;
            }
          },
          args: [request.text, request.images || []]
        });
        
        console.log('[Background] pasteContent実行結果:', pasteResults);
        const pasteResult = pasteResults && pasteResults[0] && pasteResults[0].result;
        console.log('[Background] pasteResult:', pasteResult);
        
        if (pasteResult === false || pasteResult === undefined) {
          console.warn('[Background] 貼り付けが失敗しました:', pasteResult);
          sendResponse({ 
            success: false, 
            error: '貼り付けに失敗しました',
            details: 'ページへの貼り付けが完了しませんでした'
          });
        } else {
          console.log('[Background] 貼り付け成功');
          sendResponse({ success: true });
        }
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
          // プラットフォームハンドラーとcontent scriptを注入（manifest.jsonと同じ順序）
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'content/platforms/clinics.js',
              'content/platforms/default.js',
              'content/platforms/x.js',
              'content/platforms/facebook.js',
              'content/platforms/google-docs.js',
              'content/content.js'
            ]
          });
          // 注入後に少し待つ（プラットフォームハンドラーの初期化を待つ）
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

  // Google Docs用: Offscreen document経由でクリップボードに書き込む
  if (request.action === 'writeToClipboard') {
    (async () => {
      try {
        console.log('[Background] クリップボードに書き込み:', request.text ? 'テキスト' : '画像');

        // Offscreen documentを作成（まだ存在しない場合）
        await setupOffscreenDocument();

        // Offscreen documentにメッセージを送信
        const response = await chrome.runtime.sendMessage({
          action: 'writeToClipboard',
          text: request.text,
          imageData: request.imageData
        });

        if (response && response.success) {
          console.log('[Background] Offscreen経由でクリップボード書き込み成功');
          sendResponse({ success: true });
        } else {
          console.error('[Background] Offscreen経由でクリップボード書き込み失敗:', response?.error);
          sendResponse({ success: false, error: response?.error || 'クリップボード書き込み失敗' });
        }
      } catch (error) {
        console.error('[Background] クリップボード書き込みエラー:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // 非同期レスポンス用
  }
});

/**
 * Offscreen documentをセットアップ
 */
async function setupOffscreenDocument() {
  // 既にOffscreen documentが存在するか確認
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen/offscreen.html')]
  });

  if (existingContexts.length > 0) {
    console.log('[Background] Offscreen document は既に存在します');
    return;
  }

  // Offscreen documentを作成
  console.log('[Background] Offscreen document を作成します');
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Google Docs等へのテキスト・画像貼り付けのため、クリップボードAPIにアクセスする必要があります'
  });

  console.log('[Background] Offscreen document を作成しました');
}

// ArrayBufferをBase64に変換
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
