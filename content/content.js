/**
 * コンテンツスクリプト - ウェブページへのテキスト貼り付け機能
 */

// 現在フォーカスされている要素を追跡
let focusedElement = null;
// 直近でフォーカスされていたcontenteditable/textarea要素（フォーカスが外れても保持）
let lastEditableElement = null;
// 貼り付け処理中フラグ（重複実行を防ぐ）
let isPasting = false;
// 選択範囲スクリーンショット用の状態
let selectionOverlay = null;
let selectionState = {
  isSelecting: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
};

/**
 * プラットフォーム検出（簡易版）
 */
function detectPlatform() {
  const url = window.location.href;
  const hostname = window.location.hostname.toLowerCase();
  
  // X (旧Twitter)
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'x';
  }
  
  // Gmail
  if (hostname.includes('mail.google.com') || hostname.includes('gmail.com')) {
    return 'gmail';
  }
  
  // Facebook
  if (hostname.includes('facebook.com')) {
    return 'facebook';
  }
  
  // MicroCMS
  if (hostname.includes('microcms.io')) {
    return 'microcms';
  }
  
  return null;
}

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
 * Facebook用のテキスト挿入（フォールバック用）
 */
async function insertTextForFacebook(element, text) {
  try {
    // HTMLエスケープ
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // 改行で分割して<div>要素に変換
    const lines = escaped.split('\n');
    const htmlParts = lines.map((line, index) => {
      if (index === 0 && line === '' && lines.length > 1) {
        return '<div><br></div>';
      } else if (line === '' && index < lines.length - 1) {
        return '<div><br></div>';
      } else if (line === '' && index === lines.length - 1) {
        return '';
      } else {
        return `<div>${line}</div>`;
      }
    });
    const htmlText = htmlParts.join('');
    
    const selection = window.getSelection();
    let range;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
    }
    
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      range.deleteContents();
    }
    
    // execCommand('insertHTML')を試す
    if (typeof document.execCommand === 'function') {
      try {
        selection.removeAllRanges();
        selection.addRange(range);
        const executed = document.execCommand('insertHTML', false, htmlText);
        if (executed) {
          const newRange = document.createRange();
          newRange.selectNodeContents(element);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          element.dispatchEvent(new InputEvent('input', { 
            bubbles: true, 
            cancelable: true,
            inputType: 'insertFromPaste',
            data: text
          }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          
          return true;
        }
      } catch (error) {
        console.warn('[Chrome to X] execCommand(insertHTML)に失敗:', error);
      }
    }
    
    // フォールバック: フラグメントを使用
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;
    const fragment = document.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    if (fragment.childNodes.length === 0) {
      return false;
    }
    
    range.insertNode(fragment);
    
    const lastNode = fragment.lastChild;
    if (lastNode) {
      if (lastNode.nodeType === Node.ELEMENT_NODE && lastNode.tagName === 'DIV') {
        range.setStart(lastNode, lastNode.childNodes.length);
      } else {
        range.setStartAfter(lastNode);
      }
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    element.dispatchEvent(new InputEvent('input', { 
      bubbles: true, 
      cancelable: true,
      inputType: 'insertFromPaste',
      data: text
    }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    return true;
  } catch (error) {
    console.error('[Chrome to X] Facebook用の挿入に失敗:', error);
    return false;
  }
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
        console.log('[Chrome to X] execCommand で挿入しました');
        if (dispatchChange) {
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
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
      // プラットフォームを検出
      const platform = detectPlatform();
      
      console.log('[Chrome to X] プラットフォーム検出結果:', platform);
      console.log('[Chrome to X] window.PlatformHandlers:', window.PlatformHandlers);
      
      // プラットフォームハンドラーを取得
      let handler = null;
      if (window.PlatformHandlers) {
        // Xの場合
        if (platform === 'x' && window.PlatformHandlers.x) {
          handler = window.PlatformHandlers.x;
          console.log('[Chrome to X] Xハンドラーを選択');
        }
        // Facebookの場合
        else if (platform === 'facebook' && window.PlatformHandlers.facebook) {
          handler = window.PlatformHandlers.facebook;
          console.log('[Chrome to X] Facebookハンドラーを選択');
        }
        // デフォルトハンドラー
        else if (window.PlatformHandlers.default) {
          handler = window.PlatformHandlers.default;
          console.log('[Chrome to X] デフォルトハンドラーを選択');
        }
      } else {
        console.warn('[Chrome to X] window.PlatformHandlersが存在しません');
      }
      
      // ハンドラーが利用可能な場合はそれを使用、そうでなければフォールバック
      let success = false;
      if (handler && handler.insertText) {
        console.log('[Chrome to X] プラットフォームハンドラーを使用:', platform, handler);
        success = await handler.insertText(element, text, {
          inputType: 'insertFromPaste',
          dispatchChange: true
        });
      } else {
        // フォールバック: 既存のロジック
        console.log('[Chrome to X] フォールバックロジックを使用', {
          platform,
          hasPlatformHandlers: !!window.PlatformHandlers,
          hasFacebookHandler: !!(window.PlatformHandlers && window.PlatformHandlers.facebook),
          handler: handler
        });
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          const start = element.selectionStart || 0;
          const end = element.selectionEnd || 0;
          const value = element.value;
          
          element.value = value.substring(0, start) + text + value.substring(end);
          
          const newPosition = start + text.length;
          element.setSelectionRange(newPosition, newPosition);
          
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          
          success = true;
        } else if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
          const isDraftEditor = element.classList.contains('public-DraftEditor-content') || 
                               element.closest('[data-testid="tweetTextarea_0"]');
          
          if (isDraftEditor) {
            success = await insertTextToDraftEditor(element, text);
          } else {
            // Facebookの場合は改行を<div>要素に変換
            if (platform === 'facebook' && text.includes('\n')) {
              console.log('[Chrome to X] フォールバック: Facebookの改行処理を実行');
              success = await insertTextForFacebook(element, text);
            } else {
              success = insertTextDirectly(element, text);
            }
          }
        }
      }
      
      if (!success) {
        throw new Error('貼り付けに失敗しました');
      }
    }
    
    // 画像の処理
    if (images && images.length > 0) {
      console.log('[Chrome to X] 画像の貼り付け開始:', images.length, '枚');
      
      // プラットフォームを検出
      const platform = detectPlatform();
      
      let uploadSuccess = false;
      
      if (platform === 'x') {
        // Xの画像アップロード機能を使用
        uploadSuccess = await uploadImagesToX(images);
      } else if (platform === 'gmail') {
        // Gmailの画像アップロード機能を使用
        uploadSuccess = await uploadImagesToGmail(images);
      } else {
        // その他のプラットフォーム: クリップボード経由で貼り付けを試行
        console.log('[Chrome to X] プラットフォーム:', platform, 'クリップボード経由で試行');
        await pasteImagesViaClipboard(element, images);
        uploadSuccess = true;
      }
      
      if (uploadSuccess) {
        showNotification(`テキストと画像${images.length}枚を貼り付けました`);
      } else {
        // フォールバック: クリップボード経由で貼り付けを試行
        console.log('[Chrome to X] 画像アップロードに失敗、クリップボード経由で試行');
        await pasteImagesViaClipboard(element, images);
        showNotification(`テキストと画像${images.length}枚を貼り付けました`);
      }
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
 * Xの画像アップロード機能を使用して画像をアップロード
 */
async function uploadImagesToX(images) {
  try {
    // Xの投稿フォーム全体を探す
    const composer = document.querySelector('[data-testid="tweetTextarea_0"]')?.closest('div[role="textbox"]')?.closest('div')?.closest('div');
    
    // ファイル入力要素を探す（ページ全体から）
    let fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                   document.querySelector('input[type="file"]');
    
    // 見つからない場合は、画像ボタンをクリックしてファイル入力を表示
    if (!fileInput) {
      // ツールバー内の画像ボタンを探す
      const toolbar = document.querySelector('[data-testid="toolBar"]');
      if (toolbar) {
        const mediaButton = toolbar.querySelector('[data-testid="attach"]') || 
                           toolbar.querySelector('button[aria-label*="画像"]') ||
                           toolbar.querySelector('button[aria-label*="メディア"]') ||
                           toolbar.querySelector('button[aria-label*="画像を追加"]');
        
        if (mediaButton) {
          console.log('[Chrome to X] 画像ボタンをクリック');
          mediaButton.click();
          // ファイル入力が表示されるまで待つ
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 再度ファイル入力を探す
          fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                     document.querySelector('input[type="file"]');
        }
      }
    }
    
    if (!fileInput) {
      console.log('[Chrome to X] ファイル入力要素が見つかりません');
      return false;
    }
    
    console.log('[Chrome to X] ファイル入力要素を発見:', fileInput);
    
    // Base64データURLからFileオブジェクトを作成
    const files = [];
    for (const image of images) {
      const base64Data = image.base64;
      const response = await fetch(base64Data);
      const blob = await response.blob();
      
      // Fileオブジェクトを作成
      const fileName = image.name || `image_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: blob.type });
      files.push(file);
    }
    
    // DataTransferオブジェクトを作成してファイルを設定
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    
    // ファイル入力にファイルを設定
    fileInput.files = dataTransfer.files;
    
    // changeイベントを発火
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(changeEvent);
    
    // inputイベントも発火（Xがリッスンしている可能性がある）
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(inputEvent);
    
    console.log('[Chrome to X] Xの画像アップロード成功:', files.length, '枚');
    
    // 画像がアップロードされるまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error) {
    console.error('[Chrome to X] Xの画像アップロードに失敗:', error);
    return false;
  }
}

/**
 * Gmailの画像アップロード機能を使用して画像をアップロード
 */
async function uploadImagesToGmail(images) {
  try {
    console.log('[Chrome to X] Gmailの画像アップロード開始');
    
    // Gmailのファイル添付ボタンを探す（複数のパターンを試す）
    // GmailのUI構造は動的に変わる可能性があるため、複数のセレクタを試す
    const attachSelectors = [
      'div[aria-label*="添付"]',
      'div[aria-label*="Attach"]',
      'div[aria-label*="ファイルを添付"]',
      'div[aria-label*="Attach files"]',
      'div[role="button"][aria-label*="添付"]',
      'div[role="button"][aria-label*="Attach"]',
      'div[data-tooltip*="添付"]',
      'div[data-tooltip*="Attach"]',
      'div[title*="添付"]',
      'div[title*="Attach"]',
      'div[aria-label="添付"]',
      'div[aria-label="Attach"]'
    ];
    
    let attachButton = null;
    for (const selector of attachSelectors) {
      attachButton = document.querySelector(selector);
      if (attachButton) {
        console.log('[Chrome to X] Gmailの添付ボタンを発見:', selector, attachButton);
        break;
      }
    }
    
    // ファイル入力要素を探す（Gmailは通常、ページ内に隠しinputがある）
    let fileInput = document.querySelector('input[type="file"]');
    
    // 見つからない場合は、添付ボタンをクリックしてファイル入力を表示
    if (!fileInput && attachButton) {
      console.log('[Chrome to X] 添付ボタンをクリック');
      attachButton.click();
      // ファイル入力が表示されるまで待つ
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 再度ファイル入力を探す
      fileInput = document.querySelector('input[type="file"]');
    }
    
    // まだ見つからない場合は、Gmailのエディタエリア内を探す
    if (!fileInput) {
      const editorArea = document.querySelector('div[role="textbox"]')?.closest('div')?.parentElement;
      if (editorArea) {
        fileInput = editorArea.querySelector('input[type="file"]');
      }
    }
    
    if (!fileInput) {
      console.log('[Chrome to X] Gmailのファイル入力要素が見つかりません');
      // フォールバック: クリップボード経由を試す
      return false;
    }
    
    console.log('[Chrome to X] Gmailのファイル入力要素を発見:', fileInput);
    
    // Base64データURLからFileオブジェクトを作成
    const files = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const base64Data = image.base64;
      const response = await fetch(base64Data);
      const blob = await response.blob();
      
      // Fileオブジェクトを作成
      const fileName = image.name || `image_${Date.now()}_${i}.png`;
      const file = new File([blob], fileName, { type: blob.type });
      files.push(file);
      
      // Gmailは1枚ずつアップロードする必要がある場合がある
      if (i === 0) {
        // 最初のファイルを設定
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        // changeイベントを発火
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        fileInput.dispatchEvent(changeEvent);
        
        // inputイベントも発火
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        fileInput.dispatchEvent(inputEvent);
        
        // 次のファイルの前に少し待つ
        if (images.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // 複数ファイルの場合は、すべてのファイルを一度に設定
    if (files.length > 1) {
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      fileInput.files = dataTransfer.files;
      
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      fileInput.dispatchEvent(changeEvent);
      
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      fileInput.dispatchEvent(inputEvent);
    }
    
    console.log('[Chrome to X] Gmailの画像アップロード成功:', files.length, '枚');
    
    // 画像がアップロードされるまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('[Chrome to X] Gmailの画像アップロードに失敗:', error);
    return false;
  }
}

/**
 * クリップボード経由で画像を貼り付ける（フォールバック）
 */
async function pasteImagesViaClipboard(element, images) {
  try {
    // 要素にフォーカス
    element.focus({ preventScroll: true });
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 画像を1枚ずつクリップボード経由で貼り付ける
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        // Base64データURLからBlobを作成
        const base64Data = image.base64;
        const response = await fetch(base64Data);
        const blob = await response.blob();
        
        // クリップボードに画像をコピー
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        
        // 少し待ってからキーボードショートカットをシミュレート
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Ctrl+V (Mac: Cmd+V) をシミュレート
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        
        const keyDownModifier = new KeyboardEvent('keydown', {
          key: isMac ? 'Meta' : 'Control',
          code: isMac ? 'MetaLeft' : 'ControlLeft',
          keyCode: isMac ? 91 : 17,
          which: isMac ? 91 : 17,
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true,
          cancelable: true
        });
        
        const keyDownV = new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          keyCode: 86,
          which: 86,
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true,
          cancelable: true
        });
        
        // pasteイベントを発火
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer()
        });
        
        Object.defineProperty(pasteEvent.clipboardData, 'items', {
          value: [{
            kind: 'file',
            type: blob.type,
            getAsFile: () => blob
          }],
          writable: false
        });
        
        Object.defineProperty(pasteEvent.clipboardData, 'files', {
          value: [blob],
          writable: false
        });
        
        element.dispatchEvent(keyDownModifier);
        element.dispatchEvent(keyDownV);
        element.dispatchEvent(pasteEvent);
        
        // keyupイベント
        const keyUpV = new KeyboardEvent('keyup', {
          key: 'v',
          code: 'KeyV',
          keyCode: 86,
          which: 86,
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true,
          cancelable: true
        });
        
        const keyUpModifier = new KeyboardEvent('keyup', {
          key: isMac ? 'Meta' : 'Control',
          code: isMac ? 'MetaLeft' : 'ControlLeft',
          keyCode: isMac ? 91 : 17,
          which: isMac ? 91 : 17,
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true,
          cancelable: true
        });
        
        element.dispatchEvent(keyUpV);
        element.dispatchEvent(keyUpModifier);
        
        // 次の画像の前に少し待つ
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`[Chrome to X] 画像${i + 1}枚目の貼り付けに失敗:`, error);
      }
    }
  } catch (error) {
    console.error('[Chrome to X] クリップボード経由の画像貼り付けに失敗:', error);
  }
}

/**
 * 選択範囲スクリーンショットを開始
 */
function startSelectionScreenshot() {
  return new Promise((resolve, reject) => {
    // 既存のオーバーレイがあれば削除
    if (selectionOverlay) {
      removeSelectionOverlay();
    }
    
    // オーバーレイを作成
    const overlay = document.createElement('div');
    overlay.id = 'chrome-to-x-selection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      cursor: crosshair;
      user-select: none;
    `;
    
    // 選択範囲ボックス
    const selectionBox = document.createElement('div');
    selectionBox.id = 'chrome-to-x-selection-box';
    selectionBox.style.cssText = `
      position: absolute;
      border: 2px dashed #1da1f2;
      background-color: rgba(29, 161, 242, 0.1);
      pointer-events: none;
      display: none;
    `;
    
    // インストラクション
    const instruction = document.createElement('div');
    instruction.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #1da1f2;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 1000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    instruction.textContent = '範囲をドラッグして選択してください（ESCキーでキャンセル）';
    
    overlay.appendChild(selectionBox);
    overlay.appendChild(instruction);
    document.body.appendChild(overlay);
    selectionOverlay = overlay;
    
    // マウスイベント
    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = overlay.getBoundingClientRect();
      selectionState.isSelecting = true;
      selectionState.startX = e.clientX - rect.left;
      selectionState.startY = e.clientY - rect.top;
      selectionState.currentX = e.clientX - rect.left;
      selectionState.currentY = e.clientY - rect.top;
      
      selectionBox.style.display = 'block';
      updateSelectionBox();
    };
    
    const handleMouseMove = (e) => {
      if (!selectionState.isSelecting) return;
      
      const rect = overlay.getBoundingClientRect();
      selectionState.currentX = e.clientX - rect.left;
      selectionState.currentY = e.clientY - rect.top;
      
      updateSelectionBox();
    };
    
    const handleMouseUp = (e) => {
      if (!selectionState.isSelecting) return;
      
      selectionState.isSelecting = false;
      
      const startX = Math.min(selectionState.startX, selectionState.currentX);
      const startY = Math.min(selectionState.startY, selectionState.currentY);
      const width = Math.abs(selectionState.currentX - selectionState.startX);
      const height = Math.abs(selectionState.currentY - selectionState.startY);
      
      if (width < 10 || height < 10) {
        // 選択範囲が小さすぎる場合は無視
        return;
      }
      
      // 選択範囲の座標を取得（ビューポート基準）
      // chrome.tabs.captureVisibleTabはビューポートのみをキャプチャするため、
      // ビューポート基準の座標を使用する
      const viewportX = startX;
      const viewportY = startY;
      
      // デバッグ情報を収集
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      console.log('[Chrome to X] 選択範囲情報:', {
        selection: {
          x: Math.round(viewportX),
          y: Math.round(viewportY),
          width: Math.round(width),
          height: Math.round(height)
        },
        viewport: {
          width: viewportWidth,
          height: viewportHeight
        },
        devicePixelRatio: devicePixelRatio,
        scroll: {
          x: scrollX,
          y: scrollY
        },
        rawCoordinates: {
          startX: selectionState.startX,
          startY: selectionState.startY,
          currentX: selectionState.currentX,
          currentY: selectionState.currentY
        }
      });
      
      // オーバーレイを削除
      removeSelectionOverlay();
      
      // 選択範囲を返す（ビューポート基準 + デバイスピクセル比を考慮）
      // chrome.tabs.captureVisibleTabはデバイスピクセル比を考慮したサイズで取得するため、
      // 座標もデバイスピクセル比を掛ける必要がある
      resolve({
        x: Math.round(viewportX * devicePixelRatio),
        y: Math.round(viewportY * devicePixelRatio),
        width: Math.round(width * devicePixelRatio),
        height: Math.round(height * devicePixelRatio),
        viewportWidth: Math.round(viewportWidth * devicePixelRatio),
        viewportHeight: Math.round(viewportHeight * devicePixelRatio),
        devicePixelRatio: devicePixelRatio
      });
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        removeSelectionOverlay();
        reject(new Error('キャンセルされました'));
      }
    };
    
    overlay.addEventListener('mousedown', handleMouseDown);
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    // クリーンアップ関数
    overlay._cleanup = () => {
      overlay.removeEventListener('mousedown', handleMouseDown);
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
    
    function updateSelectionBox() {
      const startX = Math.min(selectionState.startX, selectionState.currentX);
      const startY = Math.min(selectionState.startY, selectionState.currentY);
      const width = Math.abs(selectionState.currentX - selectionState.startX);
      const height = Math.abs(selectionState.currentY - selectionState.startY);
      
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    }
  });
}

/**
 * 選択範囲オーバーレイを削除
 */
function removeSelectionOverlay() {
  if (selectionOverlay) {
    if (selectionOverlay._cleanup) {
      selectionOverlay._cleanup();
    }
    selectionOverlay.remove();
    selectionOverlay = null;
    selectionState.isSelecting = false;
  }
}

/**
 * 選択範囲スクリーンショットをキャンセル
 */
function cancelSelectionScreenshot() {
  removeSelectionOverlay();
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
  
  if (request.action === 'startSelectionScreenshot') {
    console.log('[Chrome to X] 選択範囲スクリーンショット開始');
    startSelectionScreenshot().then((selection) => {
      sendResponse({ success: true, selection: selection });
    }).catch((error) => {
      console.error('[Chrome to X] 選択範囲スクリーンショットエラー:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 非同期レスポンス用
  }
  
  if (request.action === 'cancelSelectionScreenshot') {
    console.log('[Chrome to X] 選択範囲スクリーンショットキャンセル');
    cancelSelectionScreenshot();
    sendResponse({ success: true });
    return true;
  }
  
  return false;
});

// 初期化
function initializeContentScript() {
  setupTextInputDetection();
  
  // document.bodyが存在するまで待機してからドラッグ&ドロップ機能を設定
  if (document.body) {
    setupImageDragAndDrop();
  } else {
    // document.bodyが存在しない場合は、DOMContentLoadedを待つ
    const checkBody = setInterval(() => {
      if (document.body) {
        clearInterval(checkBody);
        setupImageDragAndDrop();
      }
    }, 100);
    
    // タイムアウト（10秒後）
    setTimeout(() => {
      clearInterval(checkBody);
    }, 10000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

/**
 * 画像のドラッグ&ドロップ機能を設定
 */
function setupImageDragAndDrop() {
  // document.bodyが存在しない場合は待機
  if (!document.body) {
    console.log('[Chrome to X] document.bodyが存在しないため、ドラッグ&ドロップ機能の設定をスキップ');
    return;
  }
  
  // ページ内の画像にドラッグ可能な属性を追加
  function makeImagesDraggable() {
    try {
      const images = document.querySelectorAll('img:not([data-chrome-to-x-draggable])');
      images.forEach(img => {
        // 既に処理済みの画像をスキップ
        if (img.hasAttribute('data-chrome-to-x-draggable')) {
          return;
        }
        
        img.setAttribute('data-chrome-to-x-draggable', 'true');
        img.draggable = true;
        
        // ドラッグ開始時に画像データを保存
        img.addEventListener('dragstart', (e) => {
          try {
            const imageUrl = img.src;
            const imageAlt = img.alt || '画像';
            
            // データURL（base64）の場合はそのまま使用
            if (imageUrl.startsWith('data:')) {
              e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'chrome-to-x-image',
                imageData: {
                  base64: imageUrl,
                  name: imageAlt || `image_${Date.now()}.png`,
                  url: imageUrl
                }
              }));
              e.dataTransfer.effectAllowed = 'copy';
              return;
            }
            
            // 通常のURLの場合は、URLを保存（sidepanel側でbackground script経由で取得）
            // クロスオリジン対応のため、常にURLを保存する方式に変更
            e.dataTransfer.setData('text/plain', JSON.stringify({
              type: 'chrome-to-x-image-url',
              url: imageUrl,
              alt: imageAlt
            }));
            e.dataTransfer.effectAllowed = 'copy';
          } catch (error) {
            console.error('[Chrome to X] ドラッグ開始時のエラー:', error);
          }
        });
        
        // ドラッグ中の視覚的フィードバック
        img.addEventListener('drag', (e) => {
          img.style.opacity = '0.5';
        });
        
        img.addEventListener('dragend', (e) => {
          img.style.opacity = '1';
        });
      });
    } catch (error) {
      console.error('[Chrome to X] 画像ドラッグ設定エラー:', error);
    }
  }
  
  // 初期実行
  makeImagesDraggable();
  
  // 動的に追加される画像にも対応（MutationObserver）
  try {
    const observer = new MutationObserver(() => {
      makeImagesDraggable();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('[Chrome to X] 画像ドラッグ&ドロップ機能を有効化');
  } catch (error) {
    console.error('[Chrome to X] MutationObserver設定エラー:', error);
  }
}

console.log('[Chrome to X] content script loaded v1.0.1');

// pasteContent 関数をグローバルに公開（background.jsから呼び出せるようにする）
window.pasteContent = pasteContent;
// 選択範囲スクリーンショット関数も公開
window.startSelectionScreenshot = startSelectionScreenshot;
window.cancelSelectionScreenshot = cancelSelectionScreenshot;

// 背景スクリプトからのカスタムイベントを受け取って貼り付けを実行
window.addEventListener('chrome-to-x-paste-request', (event) => {
  const detail = event.detail || {};
  pasteContent(detail.text || '', detail.images || []);
});
