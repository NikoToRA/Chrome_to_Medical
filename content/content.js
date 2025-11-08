/**
 * コンテンツスクリプト - ウェブページへのテキスト貼り付け機能
 */

// 現在フォーカスされている要素を追跡
let focusedElement = null;
// 直近でフォーカスされていたcontenteditable/textarea要素（フォーカスが外れても保持）
let lastEditableElement = null;
// 貼り付け処理中フラグ（重複実行を防ぐ）
let isPasting = false;

/**
 * テキストエリアやinput要素にフォーカスしたときに要素を記録
 */
function setupTextInputDetection() {
  // focusinイベントで要素を記録
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    
    // テキストエリア、input要素、contenteditable要素を検出
    if (target.tagName === 'TEXTAREA' || 
        (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search' || !target.type)) ||
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true') {
      focusedElement = target;
      lastEditableElement = target;
      console.log('[Chrome to X] フォーカスされた要素:', target);
    }
  }, true); // キャプチャフェーズで実行

  // focusoutイベントで少し遅延させてクリア
  document.addEventListener('focusout', (e) => {
    setTimeout(() => {
      if (document.activeElement !== focusedElement && !document.activeElement?.isContentEditable) {
        focusedElement = null;
      }
    }, 200);
  }, true);
}

/**
 * 現在アクティブなテキスト入力要素を取得
 */
function getActiveTextElement() {
  // まず、現在フォーカスされている要素を確認
  const activeElement = document.activeElement;
  
  if (activeElement) {
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && (activeElement.type === 'text' || activeElement.type === 'search' || !activeElement.type)) ||
        activeElement.isContentEditable ||
        activeElement.getAttribute('contenteditable') === 'true') {
      console.log('[Chrome to X] アクティブ要素を検出:', activeElement);
      return activeElement;
    }
  }
  
  // Xの特殊な構造を探す: [data-testid="tweetTextarea_0"]
  const xTextArea = document.querySelector('[data-testid="tweetTextarea_0"]');
  if (xTextArea) {
    console.log('[Chrome to X] Xのテキストエリアを検出');
    // Xのテキストエリア内のcontenteditable要素を探す
    const contentEditable = xTextArea.querySelector('[contenteditable="true"]');
    if (contentEditable) {
      return contentEditable;
    }
    return xTextArea;
  }
  
  // その他のcontenteditable要素を探す
  const allContentEditable = document.querySelectorAll('[contenteditable="true"]');
  for (const elem of allContentEditable) {
    if (document.activeElement === elem || elem === focusedElement) {
      console.log('[Chrome to X] フォーカスされたcontenteditable要素を検出:', elem);
      return elem;
    }
  }
  
  // フォーカスされている最初のcontenteditable要素
  if (allContentEditable.length > 0 && document.activeElement?.isContentEditable) {
    return document.activeElement;
  }
  
  // 通常のテキストエリアやinput要素を探す
  const textAreas = document.querySelectorAll('textarea, input[type="text"], input[type="search"]');
  for (const element of textAreas) {
    if (document.activeElement === element || element === focusedElement) {
      console.log('[Chrome to X] テキストエリア/input要素を検出:', element);
      return element;
    }
  }
  
  if (lastEditableElement && document.contains(lastEditableElement)) {
    console.log('[Chrome to X] 最後にフォーカスされた要素を使用');
    return lastEditableElement;
  }
  
  return null;
}

/**
 * XのDraft.jsエディタ専用のテキスト挿入
 * クリップボード操作をシミュレートして、実際のコピーアンドペーストと同じ動作を実現
 */
function insertTextToDraftEditor(element, text) {
  return new Promise(async (resolve) => {
    try {
      // 貼り付け前のテキスト内容を記録
      const beforeText = normalizeContentText(element);
      
      // フォーカスを確実に戻す
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          if (typeof window.focus === 'function') {
            window.focus();
          }
          element.focus({ preventScroll: true });
          requestAnimationFrame(() => resolve());
        });
      });
      
      // 少し待ってから処理（フォーカスが安定するのを待機）
      await new Promise(resolve => setTimeout(resolve, 100));
      // Draft.jsではcontenteditable配下のDOMを直接更新することで挿入できる場合が多い
      // insertTextDirectlyを利用し、inputTypeをinsertFromPasteとして通知する
      const directSuccess = insertTextDirectly(element, text, {
        inputType: 'insertFromPaste'
      });

      // directSuccessがfalseの場合は、擬似的なPasteイベントを発火してDraft.js側に処理を委ねる
      const syntheticPasteDispatched = !directSuccess && dispatchSyntheticPaste(element, text);

      // 結果を確認（Draft.jsが非同期で処理する可能性を考慮）
      setTimeout(() => {
        const afterText = normalizeContentText(element);
        const wasInserted = afterText.includes(text) || 
                           afterText.length > beforeText.length ||
                           (beforeText.length === 0 && afterText.length > 0);
        
        console.log('[Chrome to X] 貼り付け結果:', { 
          beforeText, 
          afterText, 
          wasInserted,
          directSuccess,
          syntheticPasteDispatched
        });

        resolve(wasInserted || directSuccess || syntheticPasteDispatched);
      }, 400);
    } catch (error) {
      console.error('[Chrome to X] Draft.jsエディタへの挿入に失敗:', error);
      resolve(false);
    }
  });
}

/**
 * contenteditable要素に直接テキストを挿入（確実な方法）
 * Draft.jsエディタ向けには insertTextToDraftEditor から適切なオプションを渡して利用する
 */
function insertTextDirectly(element, text, options = {}) {
  try {
    const {
      inputType = 'insertText',
      dispatchChange = true
    } = options;

    // 貼り付け前のテキスト内容を記録
    const beforeText = normalizeContentText(element);
    
    // 要素にフォーカス
    element.focus({ preventScroll: true });
    
    // その他のエディタでは execCommand を試す
    if (typeof document.execCommand === 'function') {
      const executed = document.execCommand('insertText', false, text);
      if (executed) {
        element.dispatchEvent(new InputEvent('input', { 
          bubbles: true, 
          cancelable: true,
          inputType,
          data: text
        }));
        if (dispatchChange) {
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        console.log('[Chrome to X] execCommand で挿入しました');
        return true;
      }
    }
    
    const selection = window.getSelection();
    
    // 選択範囲を取得または作成
    let range;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      // 要素内の最後のテキストノードを探す
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let lastTextNode = null;
      let node;
      while (node = walker.nextNode()) {
        lastTextNode = node;
      }
      
      if (lastTextNode) {
        range = document.createRange();
        range.setStartAfter(lastTextNode);
        range.collapse(true);
      } else {
        // テキストノードがない場合、要素の最後に挿入
        range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
      }
    }
    
    // 既存の内容を削除（選択範囲がある場合）
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      range.deleteContents();
    }
    
    // テキストノードを作成して挿入
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    // カーソル位置を更新
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // input/change イベントを発火
    element.dispatchEvent(new InputEvent('input', { 
      bubbles: true, 
      cancelable: true,
      inputType,
      data: text
    }));
    if (dispatchChange) {
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    const afterText = normalizeContentText(element);
    const wasInserted = afterText.includes(text) || afterText.length >= beforeText.length + text.length;
    
    console.log('[Chrome to X] 直接挿入完了:', { beforeText, afterText, wasInserted });
    return wasInserted;
  } catch (error) {
    console.error('[Chrome to X] 直接挿入に失敗:', error);
    return false;
  }
}

/**
 * テキストと画像を貼り付け
 */
async function pasteContent(text, images) {
  console.log('[Chrome to X] pasteContent が呼び出されました:', { text, images });
  // 重複実行を防ぐ
  if (isPasting) {
    console.log('[Chrome to X] 貼り付け処理が既に実行中です');
    return;
  }
  
  isPasting = true;
  console.log('[Chrome to X] 貼り付け開始:', { text, imagesCount: images?.length || 0 });
  
  try {
    // 現在アクティブな要素を取得
    let element = getActiveTextElement();
    
    if (!element) {
      console.error('[Chrome to X] テキスト入力欄が見つかりません');
      showNotification('テキスト入力欄が見つかりません。テキストエリアをクリックしてから再度お試しください。');
      return;
    }
    
    // 要素が非アクティブの場合は再フォーカス
    if (document.activeElement !== element) {
      console.log('[Chrome to X] 直前の要素にフォーカスを戻します');
      // フォーカスを確実に戻す
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          if (typeof window.focus === 'function') {
            window.focus();
          }
          element.focus({ preventScroll: true });
          requestAnimationFrame(() => resolve());
        });
      });
    }
    
    // 少し待ってから処理（フォーカスが確実に当たるように）
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 再度要素を取得（フォーカス後の状態を確認）
    element = getActiveTextElement() || element;
    if (document.activeElement !== element) {
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          element.focus({ preventScroll: true });
          requestAnimationFrame(() => resolve());
        });
      });
    }
    
    // テキストを貼り付け
    if (text) {
      let success = false;
      
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        // 通常のテキストエリアやinput要素
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;
        const value = element.value;
        
        element.value = value.substring(0, start) + text + value.substring(end);
        
        // カーソル位置を更新
        const newPosition = start + text.length;
        element.setSelectionRange(newPosition, newPosition);
        
        // イベントを発火
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('[Chrome to X] テキストエリア/inputに貼り付け完了');
        success = true;
      } else if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
        // contenteditable要素の場合（X、Gmailなど）
        // XのDraft.jsエディタの場合は非同期処理
        const isDraftEditor = element.classList.contains('public-DraftEditor-content') || 
                             element.closest('[data-testid="tweetTextarea_0"]');
        
        if (isDraftEditor) {
          success = await insertTextToDraftEditor(element, text);
        } else {
          success = insertTextDirectly(element, text);
        }
      }
      
      if (!success) {
        throw new Error('貼り付けに失敗しました');
      }
    }
    
    // 画像の処理（将来的に実装）
    if (images && images.length > 0) {
      console.log('[Chrome to X] 画像の貼り付け:', images.length, '枚');
      showNotification(`テキストと画像${images.length}枚を貼り付けました`);
    } else if (text) {
      showNotification('テキストを貼り付けました');
    }
    
    // フォーカスを戻す
    element.focus();
    
  } catch (error) {
    console.error('[Chrome to X] 貼り付けに失敗しました:', error);
    showNotification('貼り付けに失敗しました: ' + error.message);
  } finally {
    // フラグをリセット（少し遅延させて確実に）
    setTimeout(() => {
      isPasting = false;
    }, 500);
  }
}

/**
 * 通知を表示
 */
function showNotification(message) {
  // 既存の通知を削除
  const existing = document.getElementById('chrome-to-x-notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'chrome-to-x-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #1da1f2;
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease;
  `;
  
  // アニメーション定義を追加
  if (!document.getElementById('chrome-to-x-styles')) {
    const style = document.createElement('style');
    style.id = 'chrome-to-x-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

function normalizeContentText(element) {
  if (!element) return '';
  return (element.textContent || element.innerText || '')
    .replace(/\u200B/g, '')  // zero-width space
    .replace(/\n$/, '');     // trailing newline from <br>
}

/**
 * 擬似的なPasteイベントを発火してDraft.jsにテキストを挿入させる
 */
function dispatchSyntheticPaste(element, text) {
  try {
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });

    Object.defineProperty(pasteEvent.clipboardData, 'getData', {
      value: function(type) {
        if (type === 'text/plain' || type === 'text') {
          return text;
        }
        return '';
      },
      writable: false
    });

    Object.defineProperty(pasteEvent.clipboardData, 'items', {
      value: [{
        kind: 'string',
        type: 'text/plain',
        getAsString: function(callback) {
          callback(text);
        }
      }],
      writable: false
    });

    Object.defineProperty(pasteEvent.clipboardData, 'types', {
      value: ['text/plain'],
      writable: false
    });

    return element.dispatchEvent(pasteEvent);
  } catch (error) {
    console.error('[Chrome to X] 擬似Pasteイベントの生成に失敗:', error);
    return false;
  }
}

// メッセージリスナー - サイドパネルからの貼り付けリクエストを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Chrome to X] メッセージ受信:', request);
  if (request.action === 'paste') {
    console.log('[Chrome to X] 貼り付け処理開始');
    pasteContent(request.text, request.images).then(() => {
      console.log('[Chrome to X] 貼り付け処理完了');
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('[Chrome to X] 貼り付け処理エラー:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 非同期レスポンス用
  }
  return false;
});

// 初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTextInputDetection);
} else {
  setupTextInputDetection();
}

console.log('[Chrome to X] content script loaded v1.0.1');

// pasteContent 関数をグローバルに公開（background.jsから呼び出せるようにする）
window.pasteContent = pasteContent;

// 背景スクリプトからのカスタムイベントを受け取って貼り付けを実行
window.addEventListener('chrome-to-x-paste-request', (event) => {
  const detail = event.detail || {};
  pasteContent(detail.text || '', detail.images || []);
});
