/**
 * コンテンツスクリプト - ウェブページへのテキスト貼り付け機能
 */

// 現在フォーカスされている要素を追跡
let focusedElement = null;
// 直近でフォーカスされていたcontenteditable/textarea要素（フォーカスが外れても保持）
let lastEditableElement = null;
// 貼り付け処理中フラグ（重複実行を防ぐ）
let isPasting = false;
// 最後にクリックした座標を保存（iframe 内でのクリック用）
let lastClickX = null;
let lastClickY = null;
// 選択範囲スクリーンショット用の状態
let selectionOverlay = null;
let selectionState = {
  isSelecting: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
};

function isEditableElement(element) {
  if (!element) return false;
  const tagName = element.tagName ? element.tagName.toUpperCase() : '';

  if (tagName === 'TEXTAREA') {
    return true;
  }

  if (tagName === 'INPUT') {
    const type = (element.type || '').toLowerCase();
    return type === '' ||
      type === 'text' ||
      type === 'search' ||
      type === 'email' ||
      type === 'url' ||
      type === 'tel' ||
      type === 'password' ||
      type === 'number';
  }

  if (element.isContentEditable) {
    return true;
  }

  const attr = typeof element.getAttribute === 'function'
    ? element.getAttribute('contenteditable')
    : null;
  if (attr && attr.toLowerCase() === 'true') {
    return true;
  }

  return false;
}

function findEditableElementInDocument(doc, visited = new WeakSet()) {
  if (!doc || visited.has(doc)) {
    return null;
  }

  visited.add(doc);

  try {
    const activeElement = doc.activeElement;

    if (isEditableElement(activeElement)) {
      console.log('[Chrome to X] アクティブ要素を検出:', activeElement);
      return activeElement;
    }

    if (activeElement && (activeElement.tagName === 'IFRAME' || activeElement.tagName === 'FRAME')) {
      try {
        // クロスオリジンかどうかを事前にチェック
        const frameWindow = activeElement.contentWindow;
        if (frameWindow) {
          const frameDoc = activeElement.contentDocument || frameWindow.document;
          if (frameDoc) {
            const nested = findEditableElementInDocument(frameDoc, visited);
            if (nested) {
              return nested;
            }
          }
        }
      } catch (error) {
        // クロスオリジンエラーは静かにスキップ（SecurityError など）
        if (error.name !== 'SecurityError' && error.name !== 'DOMException') {
          console.warn('[Chrome to X] iframe内の要素取得に失敗:', error);
        }
      }
    }

    const focusedSelector = 'textarea:focus, input[type="text"]:focus, input[type="search"]:focus, input:not([type]):focus, [contenteditable="true"]:focus, [role="textbox"]:focus';
    const focused = doc.querySelector(focusedSelector);
    if (isEditableElement(focused)) {
      console.log('[Chrome to X] フォーカス中の要素を検出:', focused);
      return focused;
    }

    const frames = doc.querySelectorAll('iframe, frame');
    for (const frame of frames) {
      try {
        // クロスオリジンかどうかを事前にチェック
        const frameWindow = frame.contentWindow;
        if (!frameWindow) {
          continue;
        }
        const frameDoc = frame.contentDocument || frameWindow.document;
        if (!frameDoc) {
          continue;
        }
        const nested = findEditableElementInDocument(frameDoc, visited);
        if (nested) {
          return nested;
        }
      } catch (error) {
        // クロスオリジンエラーは静かにスキップ（SecurityError など）
        if (error.name !== 'SecurityError' && error.name !== 'DOMException') {
          console.warn('[Chrome to X] iframe探索中にエラー:', error);
        }
        continue;
      }
    }
  } catch (error) {
    console.warn('[Chrome to X] 編集要素の探索中にエラーが発生:', error);
  }

  return null;
}

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

  // Notion
  if (hostname.includes('notion.so') || hostname.includes('notion.site')) {
    return 'notion';
  }

  // CLINICS（ドメインに clinics を含む場合を暫定判定）
  if (hostname.includes('clinics')) {
    return 'clinics';
  }

  // Google Docs (無効化: 貼り付けが不安定なため一旦機能を停止)
  // if (hostname.includes('docs.google.com')) {
  //   return 'google-docs';
  // }

  return null;
}

const PLATFORM_HANDLER_WAIT_TIMEOUT = 500; // 2.5秒から500msに短縮
const PLATFORM_HANDLER_WAIT_INTERVAL = 50; // 150msから50msに短縮

function getPlatformHandlers() {
  // メインフレームのwindow.PlatformHandlersを優先的に使用
  try {
    if (window.top && window.top !== window && window.top.PlatformHandlers) {
      console.log('[Chrome to X] メインフレームのPlatformHandlersを使用');
      return window.top.PlatformHandlers;
    }
  } catch (error) {
    // クロスオリジンの場合はアクセスできない（正常）
  }
  
  // 現在のフレームのwindow.PlatformHandlersを使用
  return window.PlatformHandlers;
}

async function waitForPlatformHandlers(requiredHandlers = []) {
  const normalized = Array.isArray(requiredHandlers)
    ? requiredHandlers.filter(Boolean)
    : [];
  
  console.log('[Chrome to X] waitForPlatformHandlers開始 - 必要なハンドラー:', normalized);
  console.log('[Chrome to X] waitForPlatformHandlers - 実行フレーム:', window === window.top ? 'メインフレーム' : 'iframe');
  
  // 最初に即座にチェック（待機なし）
  const immediateCheck = getPlatformHandlers();
  console.log('[Chrome to X] waitForPlatformHandlers - 即座チェック:', immediateCheck ? Object.keys(immediateCheck) : 'undefined');
  
  if (immediateCheck) {
    const missing = normalized.filter((name) => !immediateCheck[name]);
    console.log('[Chrome to X] waitForPlatformHandlers - 不足しているハンドラー:', missing);
    if (missing.length === 0) {
      console.log('[Chrome to X] waitForPlatformHandlers - すべてのハンドラーが利用可能（即座に返却）');
      return immediateCheck;
    }
  } else {
    console.log('[Chrome to X] waitForPlatformHandlers - window.PlatformHandlersが未定義、待機開始');
  }
  
  // 必要なハンドラーがない場合のみ待機
  const deadline = Date.now() + PLATFORM_HANDLER_WAIT_TIMEOUT;
  let attemptCount = 0;

  while (Date.now() < deadline) {
    attemptCount++;
    const handlers = getPlatformHandlers();
    if (handlers) {
      const missing = normalized.filter((name) => !handlers[name]);
      console.log(`[Chrome to X] waitForPlatformHandlers - 試行${attemptCount}: 利用可能:`, Object.keys(handlers), '不足:', missing);
      if (missing.length === 0) {
        console.log('[Chrome to X] waitForPlatformHandlers - すべてのハンドラーが利用可能（待機後）');
        return handlers;
      }
    } else {
      console.log(`[Chrome to X] waitForPlatformHandlers - 試行${attemptCount}: window.PlatformHandlersが未定義`);
    }
    await new Promise(resolve => setTimeout(resolve, PLATFORM_HANDLER_WAIT_INTERVAL));
  }

  // タイムアウト後、利用可能なハンドラーを返す（完全一致でなくてもOK）
  const finalHandlers = getPlatformHandlers();
  console.log('[Chrome to X] waitForPlatformHandlers - タイムアウト。最終結果:', finalHandlers ? Object.keys(finalHandlers) : 'null');
  return finalHandlers;
}

/**
 * テキストエリアやinput要素にフォーカスしたときに要素を記録
 */
function setupTextInputDetection() {
  const isInIframe = window !== window.top;
  
  // 編集可能な要素を記録する共通関数
  function recordEditableElement(element) {
    if (!element) return;
    
    if (element.tagName === 'TEXTAREA' || 
        (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search' || !element.type)) ||
        element.isContentEditable ||
        element.getAttribute('contenteditable') === 'true') {
      focusedElement = element;
      lastEditableElement = element;
      console.log('[Chrome to X] 編集可能な要素を保存:', element.tagName, element.id || element.className);
      
      // iframe内で実行されている場合、postMessageでメインフレームに通知
      if (isInIframe) {
        try {
          window.top.postMessage({
            type: 'CHROME_TO_X_FOCUSED_ELEMENT',
            elementInfo: {
              tagName: element.tagName,
              id: element.id,
              className: element.className,
              name: element.name
            }
          }, '*');
          console.log('[Chrome to X] メインフレームに要素情報を送信:', element.tagName);
        } catch (error) {
          console.warn('[Chrome to X] メインフレームへの通知に失敗:', error);
        }
      }
    }
  }
  
  // focusinイベントで要素を記録
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    console.log('[Chrome to X] focusin イベント:', {
      target: target,
      tagName: target?.tagName,
      isInIframe: isInIframe
    });
    recordEditableElement(target);
  }, true); // キャプチャフェーズで実行
  
  // clickイベントで要素を記録（フォーカスが外れてもクリック位置を記録）
  document.addEventListener('click', (e) => {
    const target = e.target;
    
    // 拡張機能の要素（通知など）をクリックした場合は無視
    if (target.id === 'chrome-to-x-notification' || 
        target.closest('#chrome-to-x-notification')) {
      console.log('[Chrome to X] 拡張機能の要素をクリック - 座標記録をスキップ');
      return;
    }
    
    // ページコンテンツのクリック座標を記録
    lastClickX = e.clientX;
    lastClickY = e.clientY;
    console.log('[Chrome to X] ページコンテンツのクリック座標を記録:', { x: lastClickX, y: lastClickY, target: target.tagName, id: target.id, className: target.className });
    
    recordEditableElement(target);
    
    // 親要素もチェック（contenteditable の親要素をクリックした場合）
    let parent = target.parentElement;
    for (let i = 0; i < 5 && parent; i++) {
      if (parent.isContentEditable || parent.getAttribute('contenteditable') === 'true') {
        recordEditableElement(parent);
        break;
      }
      parent = parent.parentElement;
    }
  }, true);
  
  // mousedownイベントで要素を記録
  document.addEventListener('mousedown', (e) => {
    const target = e.target;
    
    // 拡張機能の要素は無視
    if (target.id === 'chrome-to-x-notification' || 
        target.closest('#chrome-to-x-notification')) {
      return;
    }
    
    recordEditableElement(target);
  }, true);
  
  // selectionchangeイベントでアクティブな要素を記録
  document.addEventListener('selectionchange', () => {
    const activeElement = document.activeElement;
    if (activeElement) {
      recordEditableElement(activeElement);
    }
  }, true);
  
  // 定期的に activeElement をチェック（フォールバック）
  setInterval(() => {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && (activeElement.type === 'text' || activeElement.type === 'search' || !activeElement.type)) ||
        activeElement.isContentEditable ||
        activeElement.getAttribute('contenteditable') === 'true')) {
      if (focusedElement !== activeElement) {
        recordEditableElement(activeElement);
      }
    }
  }, 1000); // 1秒ごとにチェック
  
  // メインフレームで、iframe からのメッセージをリッスン
  if (!isInIframe) {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CHROME_TO_X_FOCUSED_ELEMENT') {
        console.log('[Chrome to X] iframe から要素情報を受信:', e.data.elementInfo);
        // iframe 内の要素を直接参照できないため、iframe を探してその中から要素を取得
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          try {
            const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (frameDoc) {
              const element = findElementInFrame(frameDoc, e.data.elementInfo);
              if (element) {
                focusedElement = element;
                lastEditableElement = element;
                console.log('[Chrome to X] iframe 内の要素を検出して保存:', element);
                break;
              }
            }
          } catch (error) {
            // クロスオリジンの場合はスキップ
            continue;
          }
        }
      }
    });
  }
  
  // iframe 内で、メインフレームからの貼り付けメッセージをリッスン
  if (isInIframe) {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CHROME_TO_X_PASTE') {
        console.log('[Chrome to X] iframe 内で貼り付けメッセージを受信:', e.data);
        pasteContent(e.data.text, e.data.images).then(() => {
          console.log('[Chrome to X] iframe 内で貼り付け完了');
        }).catch((error) => {
          console.error('[Chrome to X] iframe 内で貼り付けエラー:', error);
        });
      }
    });
  }
  
  // iframe 内の要素を検索するヘルパー関数
  function findElementInFrame(frameDoc, elementInfo) {
    // ID で検索
    if (elementInfo.id) {
      const element = frameDoc.getElementById(elementInfo.id);
      if (element && isEditableElement(element)) {
        return element;
      }
    }
    
    // クラス名で検索
    if (elementInfo.className) {
      const elements = frameDoc.querySelectorAll(`.${elementInfo.className.split(' ')[0]}`);
      for (const el of elements) {
        if (el.tagName === elementInfo.tagName && isEditableElement(el)) {
          return el;
        }
      }
    }
    
    // タグ名で検索
    const elements = frameDoc.querySelectorAll(elementInfo.tagName);
    for (const el of elements) {
      if (isEditableElement(el)) {
        return el;
      }
    }
    
    return null;
  }

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
 * 要素が有効かどうかを確認（iframe内の要素も含む）
 */
function isElementValid(element) {
  if (!element) return false;
  try {
    // ownerDocumentを確認（iframe内の要素でも有効）
    const ownerDoc = element.ownerDocument;
    if (!ownerDoc) return false;
    
    // 要素の基本プロパティにアクセスできるか確認
    const tagName = element.tagName;
    if (!tagName) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 現在アクティブなテキスト入力要素を取得
 */
function getActiveTextElement() {
  console.log('[Chrome to X] getActiveTextElement 呼び出し:', {
    lastEditableElement: lastEditableElement,
    focusedElement: focusedElement,
    documentActiveElement: document.activeElement
  });
  
  // document.activeElement が iframe の場合、その iframe 内の activeElement を確認
  if (document.activeElement && (document.activeElement.tagName === 'IFRAME' || document.activeElement.tagName === 'FRAME')) {
    try {
      const iframe = document.activeElement;
      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (frameDoc) {
        const frameActiveElement = frameDoc.activeElement;
        console.log('[Chrome to X] iframe内のactiveElement:', frameActiveElement);
        if (frameActiveElement && isEditableElement(frameActiveElement)) {
          console.log('[Chrome to X] iframe内の編集要素を検出:', frameActiveElement);
          return frameActiveElement;
        }
      }
    } catch (error) {
      console.warn('[Chrome to X] iframe内のactiveElement取得に失敗:', error);
    }
  }
  
  // まず、保存された要素が有効か確認（iframe内の要素も含む）
  if (lastEditableElement && isElementValid(lastEditableElement)) {
    try {
      // 要素がまだ有効で、編集可能な要素か確認
      if (isEditableElement(lastEditableElement)) {
        console.log('[Chrome to X] 保存された編集要素を使用:', lastEditableElement);
        return lastEditableElement;
      }
    } catch (error) {
      // 要素へのアクセスが失敗した場合は無視
      console.warn('[Chrome to X] 保存された編集要素へのアクセスに失敗:', error);
    }
  }
  
  if (focusedElement && isElementValid(focusedElement)) {
    try {
      if (isEditableElement(focusedElement)) {
        console.log('[Chrome to X] 保存されたフォーカス要素を使用:', focusedElement);
        return focusedElement;
      }
    } catch (error) {
      // 要素へのアクセスが失敗した場合は無視
      console.warn('[Chrome to X] 保存されたフォーカス要素へのアクセスに失敗:', error);
    }
  }
  
  const editableFromDocument = findEditableElementInDocument(document);
  if (editableFromDocument) {
    return editableFromDocument;
  }

  // Google Docsの場合は専用の処理 (無効化: 貼り付けが不安定なため一旦機能を停止)
  // if (window.location.hostname.includes('docs.google.com')) {
  //   console.log('[Chrome to X] Google Docsを検出');
  //   if (window.PlatformHandlers && window.PlatformHandlers['google-docs']) {
  //     const editor = window.PlatformHandlers['google-docs'].getEditor();
  //     if (editor) {
  //       console.log('[Chrome to X] Google Docsエディタを取得:', editor);
  //       return editor;
  //     }
  //   }
  //   // フォールバック: Google Docsのエディタ要素を直接探す
  //   const googleDocsEditor = document.querySelector('.kix-canvas-tile-content') ||
  //                           document.querySelector('.kix-page-canvas') ||
  //                           document.querySelector('.kix-appview-editor');
  //   if (googleDocsEditor) {
  //     console.log('[Chrome to X] Google Docsエディタ(フォールバック)を検出:', googleDocsEditor);
  //     return googleDocsEditor;
  //   }
  // }

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
        const afterText = normalizeContentText(element);
        const wasInserted = afterText.includes(text) || afterText.length >= beforeText.length + text.length;
        console.log('[Chrome to X] 直接挿入完了 (execCommand):', { beforeText, afterText, wasInserted });
        return wasInserted;
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
    return false;
  }

  isPasting = true;
  console.log('[Chrome to X] 貼り付け開始:', { text, imagesCount: images?.length || 0 });

  try {
    // フォーカスを保存（貼り付け処理中にフォーカスが外れないように）
    const savedActiveElement = document.activeElement;
    const savedFocusedElement = focusedElement;
    const savedLastEditableElement = lastEditableElement;

    // 現在アクティブな要素を取得
    let element = getActiveTextElement();

    if (!element) {
      // 保存したフォーカス情報から要素を復元を試みる（iframe内の要素も含む）
      if (savedLastEditableElement && isElementValid(savedLastEditableElement)) {
        try {
          if (isEditableElement(savedLastEditableElement)) {
            console.log('[Chrome to X] 保存された要素を使用して復元を試みます');
            element = savedLastEditableElement;
          }
        } catch (error) {
          console.warn('[Chrome to X] 保存された要素へのアクセスに失敗:', error);
        }
      }

      if (!element && savedFocusedElement && isElementValid(savedFocusedElement)) {
        try {
          if (isEditableElement(savedFocusedElement)) {
            console.log('[Chrome to X] 保存されたフォーカス要素を使用して復元を試みます');
            element = savedFocusedElement;
          }
        } catch (error) {
          console.warn('[Chrome to X] 保存されたフォーカス要素へのアクセスに失敗:', error);
        }
      }

      if (!element && savedActiveElement && isElementValid(savedActiveElement)) {
        try {
          if (isEditableElement(savedActiveElement)) {
            console.log('[Chrome to X] 保存されたアクティブ要素を使用して復元を試みます');
            element = savedActiveElement;
          }
        } catch (error) {
          console.warn('[Chrome to X] 保存されたアクティブ要素へのアクセスに失敗:', error);
        }
      }

      // 最終フォールバック: document.activeElementを直接使用
      // ただしIFRAMEの場合は特別扱い（iframe内には直接貼り付けできないため）
      if (!element && document.activeElement) {
        const tagName = document.activeElement.tagName;
        if (tagName === 'IFRAME' || tagName === 'FRAME') {
          console.log('[Chrome to X] document.activeElementがiframeです。クリップボード経由で貼り付けを試行します。');
          // elementはnullのまま、後続のクリップボード処理に進む
        } else {
          console.log('[Chrome to X] 最終フォールバック: document.activeElementを使用:', tagName);
          element = document.activeElement;
        }
      }
    }

    if (!element) {
      console.warn('[Chrome to X] テキスト入力欄が見つかりません。クリップボード経由で貼り付けを試行します。');

      // クリップボードに書き込み
      try {
        const clipboardResponse = await chrome.runtime.sendMessage({
          action: 'writeToClipboard',
          text: text
        });

        if (!clipboardResponse || !clipboardResponse.success) {
          console.error('[Chrome to X] クリップボード書き込み失敗');
          showNotification('貼り付けに失敗しました', 3000);
          return false;
        }

        console.log('[Chrome to X] クリップボードに書き込み成功');
        await new Promise(resolve => setTimeout(resolve, 150));

        // Cmd/Ctrl+Vを自動送信
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        // document.activeElement が iframe の場合
        if (document.activeElement && (document.activeElement.tagName === 'IFRAME' || document.activeElement.tagName === 'FRAME')) {
          const iframe = document.activeElement;
          console.log('[Chrome to X] iframeにフォーカスがあります');

          // iframe 内の document に直接アクセスを試みる
          let directInsertSuccess = false;
          try {
            const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (frameDoc) {
              console.log('[Chrome to X] iframe 内の document にアクセス成功（同一オリジン）');

              // 編集可能な要素を探す
              const editables = frameDoc.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"]');

              if (editables.length > 0) {
                const targetElement = editables[0];
                console.log('[Chrome to X] ターゲット要素:', targetElement.tagName);

                // フォーカスを当てる
                targetElement.focus();
                await new Promise(resolve => setTimeout(resolve, 50));

                // プラットフォームハンドラーを使って挿入（汎用ハンドラーを優先）
                if (window.PlatformHandlers && (window.PlatformHandlers.generic || window.PlatformHandlers.default)) {
                  const handler = window.PlatformHandlers.generic || window.PlatformHandlers.default;
                  directInsertSuccess = await handler.insertText(targetElement, text);
                  if (directInsertSuccess) {
                    console.log('[Chrome to X] iframe 内に直接挿入成功');
                    showNotification('テキストを貼り付けました');
                    return true;
                  }
                }
              }
            }
          } catch (error) {
            // クロスオリジンの場合はSecurityErrorが発生するが、これは正常
            if (error.name === 'SecurityError' || error.name === 'DOMException') {
              console.log('[Chrome to X] iframe はクロスオリジンです。手動貼り付けを案内します');
            } else {
              console.warn('[Chrome to X] iframe 内への直接貼り付けエラー:', error);
            }
          }

          // クロスオリジンまたは直接挿入失敗の場合、ユーザーに通知
          if (!directInsertSuccess) {
            console.log('[Chrome to X] 自動貼り付けできません。ユーザーに手動貼り付けを案内します');
            iframe.focus();
            await new Promise(resolve => setTimeout(resolve, 100));
            const shortcut = isMac ? 'Cmd+V' : 'Ctrl+V';
            showNotification(`クリップボードに保存しました。${shortcut} で貼り付けてください`, 5000);
            return true;
          }
        } else {
          // iframe が activeElement でない場合、すべての iframe に試行
          const iframes = document.querySelectorAll('iframe');
          console.log('[Chrome to X] すべての iframe にキーボードイベントを送信します。iframe 数:', iframes.length);
          
          for (const iframe of iframes) {
            try {
              iframe.focus();
              await new Promise(resolve => setTimeout(resolve, 50));
              
              const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
              
              const pasteKeyDown = new KeyboardEvent('keydown', {
                key: 'v',
                code: 'KeyV',
                keyCode: 86,
                which: 86,
                ctrlKey: !isMac,
                metaKey: isMac,
                bubbles: true,
                cancelable: true,
                view: window
              });
              
              const pasteKeyUp = new KeyboardEvent('keyup', {
                key: 'v',
                code: 'KeyV',
                keyCode: 86,
                which: 86,
                ctrlKey: !isMac,
                metaKey: isMac,
                bubbles: true,
                cancelable: true,
                view: window
              });
              
              // iframe 内の document で execCommand('paste') を試す
              try {
                const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (frameDoc) {
                  console.log('[Chrome to X] iframe 内で execCommand("paste") を実行');
                  const executed = frameDoc.execCommand('paste');
                  if (executed) {
                    console.log('[Chrome to X] iframe 内で貼り付け成功:', iframe);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    showNotification('テキストを貼り付けました');
                    return true;
                  }
                }
              } catch (error) {
                console.warn('[Chrome to X] iframe 内での execCommand("paste") に失敗:', error);
              }
              
              // execCommand が失敗した場合、キーボードイベントを送信
              iframe.dispatchEvent(pasteKeyDown);
              iframe.dispatchEvent(pasteKeyUp);
              
              console.log('[Chrome to X] iframe にキーボードイベントを送信:', iframe);
              
              // iframe にフォーカスを維持
              iframe.focus();
              
              // iframe 内の要素にフォーカスを当てる
              let focusSuccess = false;
              try {
                const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (frameDoc) {
                  const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: iframe.contentWindow
                  });
                  frameDoc.body?.dispatchEvent(clickEvent);
                  
                  const editables = frameDoc.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
                  if (editables.length > 0) {
                    editables[0].focus();
                    console.log('[Chrome to X] iframe 内の編集可能要素にフォーカスを当てました');
                    focusSuccess = true;
                  }
                }
              } catch (error) {
                console.warn('[Chrome to X] iframe 内の要素へのフォーカスに失敗:', error);
              }
              
              // iframe 内の要素にアクセスできない場合、最後のクリック座標をクリック
              if (!focusSuccess) {
                try {
                  let clickX, clickY;
                  
                  if (lastClickX !== null && lastClickY !== null) {
                    clickX = lastClickX;
                    clickY = lastClickY;
                    console.log('[Chrome to X] 最後のクリック座標を使用:', { x: clickX, y: clickY });
                  } else {
                    const rect = iframe.getBoundingClientRect();
                    clickX = rect.left + rect.width / 2;
                    clickY = rect.top + rect.height / 2;
                    console.log('[Chrome to X] iframe の中心座標を使用:', { x: clickX, y: clickY });
                  }
                  
                  const mouseDownEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: clickX,
                    clientY: clickY
                  });
                  
                  const mouseUpEvent = new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: clickX,
                    clientY: clickY
                  });
                  
                  const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: clickX,
                    clientY: clickY
                  });
                  
                  const elementAtPoint = document.elementFromPoint(clickX, clickY);
                  if (elementAtPoint) {
                    console.log('[Chrome to X] 座標の要素にクリックイベントを送信:', elementAtPoint.tagName);
                    elementAtPoint.dispatchEvent(mouseDownEvent);
                    elementAtPoint.dispatchEvent(mouseUpEvent);
                    elementAtPoint.dispatchEvent(clickEvent);
                  }
                  
                  await new Promise(resolve => setTimeout(resolve, 50));
                  iframe.focus();
                } catch (error) {
                  console.warn('[Chrome to X] クリック座標の再現に失敗:', error);
                }
              }
            } catch (error) {
              console.warn('[Chrome to X] iframe へのイベント送信に失敗:', error);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // ページにフォーカスを戻す（拡張機能のボタンからフォーカスを奪還）
          try {
            window.focus();
            console.log('[Chrome to X] window.focus() を実行');
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 最後にアクティブな iframe にもう一度フォーカスを当てる
            if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
              const activeIframe = document.activeElement;
              activeIframe.focus();
              console.log('[Chrome to X] アクティブな iframe に再フォーカス');
              
              // 最後のクリック座標をクリック
              try {
                let clickX, clickY;
                
                if (lastClickX !== null && lastClickY !== null) {
                  clickX = lastClickX;
                  clickY = lastClickY;
                  console.log('[Chrome to X] アクティブな iframe の最後のクリック座標を使用:', { x: clickX, y: clickY });
                } else {
                  const rect = activeIframe.getBoundingClientRect();
                  clickX = rect.left + rect.width / 2;
                  clickY = rect.top + rect.height / 2;
                  console.log('[Chrome to X] アクティブな iframe の中心座標を使用:', { x: clickX, y: clickY });
                }
                
                const clickEvent = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                  clientX: clickX,
                  clientY: clickY
                });
                
                const elementAtPoint = document.elementFromPoint(clickX, clickY);
                if (elementAtPoint) {
                  elementAtPoint.dispatchEvent(clickEvent);
                  console.log('[Chrome to X] アクティブな iframe の座標をクリック');
                }
              } catch (error) {
                console.warn('[Chrome to X] アクティブな iframe のクリックに失敗:', error);
              }
            } else {
              // iframe がアクティブでない場合、すべての iframe を探す
              const iframes = document.querySelectorAll('iframe');
              if (iframes.length > 0 && lastClickX !== null && lastClickY !== null) {
                // 最後のクリック座標に最も近い iframe を探す
                let closestIframe = null;
                let minDistance = Infinity;
                
                for (const iframe of iframes) {
                  const rect = iframe.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const distance = Math.sqrt(Math.pow(centerX - lastClickX, 2) + Math.pow(centerY - lastClickY, 2));
                  
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestIframe = iframe;
                  }
                }
                
                if (closestIframe) {
                  closestIframe.focus();
                  console.log('[Chrome to X] 最も近い iframe にフォーカス');
                  
                  await new Promise(resolve => setTimeout(resolve, 50));
                  
                  // クリックイベントを送信
                  const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: lastClickX,
                    clientY: lastClickY
                  });
                  
                  const elementAtPoint = document.elementFromPoint(lastClickX, lastClickY);
                  if (elementAtPoint) {
                    elementAtPoint.dispatchEvent(clickEvent);
                    console.log('[Chrome to X] 最後のクリック座標をクリック');
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[Chrome to X] フォーカス復元に失敗:', error);
          }
          
          // ユーザーに手動での貼り付けを案内
          showNotification('クリップボードに保存しました。Ctrl/Cmd+V で貼り付けてください。', 5000);
          return true;
        }
      } catch (error) {
        console.error('[Chrome to X] クリップボード経由の貼り付けに失敗:', error);
        showNotification('貼り付けに失敗しました: ' + error.message);
        return false;
      }
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
    
    // プラットフォームを検出（テキストと画像の両方で使用）
    const platform = detectPlatform();
    
    console.log('[Chrome to X] プラットフォーム検出結果:', platform);
    
    // デバッグ: 即座にチェック（メインフレーム優先）
    const currentHandlers = (() => {
      try {
        if (window.top && window.top !== window && window.top.PlatformHandlers) {
          return window.top.PlatformHandlers;
        }
      } catch (error) {
        // クロスオリジンの場合はアクセスできない
      }
      return window.PlatformHandlers;
    })();
    
    console.log('[Chrome to X] 即座チェック - window.PlatformHandlers:', currentHandlers);
    console.log('[Chrome to X] 即座チェック - 実行フレーム:', window === window.top ? 'メインフレーム' : 'iframe');
    if (currentHandlers) {
      console.log('[Chrome to X] 即座チェック - 利用可能なハンドラー:', Object.keys(currentHandlers));
      console.log('[Chrome to X] 即座チェック - notion存在:', !!currentHandlers.notion);
      console.log('[Chrome to X] 即座チェック - generic存在:', !!currentHandlers.generic);
    }
    
    // ハンドラー取得（短いタイムアウトで高速化）
    const requiredHandlers = platform ? [platform, 'generic'] : ['generic'];
    console.log('[Chrome to X] 必要なハンドラー:', requiredHandlers);
    const handlers = await waitForPlatformHandlers(requiredHandlers);
    const availableHandlers = handlers ? Object.keys(handlers) : [];
    console.log('[Chrome to X] window.PlatformHandlers:', handlers);
    console.log('[Chrome to X] 利用可能なハンドラー:', availableHandlers);
    
    // デバッグ: 必要なハンドラーが存在するか確認
    if (handlers) {
      requiredHandlers.forEach(name => {
        console.log(`[Chrome to X] ハンドラー ${name} 存在:`, !!handlers[name]);
      });
    }

    // ハンドラー選択（優先順位: platform > generic > default）
    let handlerKey = null;
    if (handlers) {
      if (platform && handlers[platform]) {
        handlerKey = platform;
        console.log('[Chrome to X] プラットフォーム専用ハンドラーを選択:', platform);
      } else if (handlers.generic) {
        handlerKey = 'generic';
        console.log('[Chrome to X] 汎用ハンドラーを選択');
      } else if (handlers.default) {
        handlerKey = 'default';
        console.log('[Chrome to X] デフォルトハンドラーを選択（フォールバック）');
      }
    }

    if (!handlerKey) {
      console.warn('[Chrome to X] 選択可能なハンドラーが見つかりません。利用可能:', availableHandlers);
    }

    const handler = handlerKey && handlers ? handlers[handlerKey] : null;
    
    // Notionの場合、画像がある場合はドラッグ&ドロップで貼り付けを試行
    if (platform === 'notion' && images && images.length > 0 && handler && typeof handler.insertImages === 'function') {
      console.log('[Chrome to X] Notion: 画像をドラッグ&ドロップで貼り付けます');
      try {
        const imageResult = await handler.insertImages(element, images);
        if (imageResult && imageResult.success) {
          console.log('[Chrome to X] Notion: 画像をドラッグ&ドロップで貼り付けました');
        }
      } catch (error) {
        console.error('[Chrome to X] Notion: 画像のドラッグ&ドロップに失敗:', error);
      }
    }
    
    // テキストを貼り付け
    if (text) {
      // ハンドラーが利用可能な場合はそれを使用、そうでなければフォールバック
      let success = false;
      if (handler && handler.insertText) {
        console.log('[Chrome to X] プラットフォームハンドラーを使用:', handlerKey || platform, handler);
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
    
      // 画像の処理（Notionの場合は既にクリップボードにコピー済みなのでスキップ）
      if (images && images.length > 0 && !(platform === 'notion' && handler && typeof handler.insertImages === 'function')) {
        console.log('[Chrome to X] 画像の貼り付け開始:', images.length, '枚');
        
        let uploadSuccess = false;
        let handlerImageResult = null;
        
        if (handler && typeof handler.insertImages === 'function') {
          try {
            handlerImageResult = await handler.insertImages(element, images);
            if (handlerImageResult && handlerImageResult.success) {
              uploadSuccess = true;
        console.log('[Chrome to X] プラットフォームハンドラーで画像貼り付け成功:', handlerKey || platform, handlerImageResult);
            } else {
              console.warn('[Chrome to X] プラットフォームハンドラーで画像貼り付け失敗:', handlerImageResult);
            }
          } catch (handlerError) {
            console.error('[Chrome to X] プラットフォームハンドラーで画像貼り付け中にエラー:', handlerError);
          }
        }
        
        if (!uploadSuccess) {
          if (platform === 'x') {
            uploadSuccess = await uploadImagesToX(images);
          } else if (platform === 'gmail') {
            uploadSuccess = await uploadImagesToGmail(images);
          } else if (platform === 'facebook') {
            uploadSuccess = await uploadImagesToFacebook(images, element);
          } else {
            console.log('[Chrome to X] プラットフォーム:', platform, 'クリップボード経由で試行');
            await pasteImagesViaClipboard(element, images);
            uploadSuccess = true;
          }
        }
        
        if (uploadSuccess) {
          showNotification(`テキストと画像${images.length}枚を貼り付けました`);
        } else {
          console.log('[Chrome to X] 画像アップロードに失敗、クリップボード経由で試行');
          await pasteImagesViaClipboard(element, images);
          showNotification(`テキストと画像${images.length}枚を貼り付けました`);
        }
      } else if (text) {
      showNotification('テキストを貼り付けました');
    }
    
    // フォーカスを戻す
    element.focus();
    
    return true;
  } catch (error) {
    console.error('[Chrome to X] 貼り付けに失敗しました:', error);
    showNotification('貼り付けに失敗しました: ' + error.message);
    return false;
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
function showNotification(message, duration = 2000) {
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
  }, duration);
}

/**
 * Draft.jsエディタのテキストを取得（改行を保持）
 */
function getDraftEditorText(element) {
  if (!element) return '';
  
  // Draft.jsエディタの場合、改行を保持する必要がある
  const isDraftEditor = element.classList.contains('public-DraftEditor-content') || 
                       element.closest('[data-testid="tweetTextarea_0"]');
  
  if (isDraftEditor) {
    // Draft.jsエディタでは、<div>要素が改行を表す
    // 直接の子要素の<div>を取得し、それぞれのテキストを改行で結合する
    const childDivs = Array.from(element.children).filter(child => child.tagName === 'DIV');
    if (childDivs.length > 0) {
      // Draft.jsのブロック構造を使用
      let text = '';
      childDivs.forEach((div, index) => {
        if (index > 0) {
          text += '\n';
        }
        // div内のテキストを取得（<br>タグも改行として扱う）
        const divText = div.innerText || div.textContent || '';
        text += divText;
      });
      return text.replace(/\u200B/g, ''); // zero-width spaceを除去
    }
    
    // フォールバック: innerTextを使用（ブラウザが改行を処理）
    const text = element.innerText || element.textContent || '';
    return text.replace(/\u200B/g, ''); // zero-width spaceを除去
  }
  
  // 通常の要素の場合
  return (element.textContent || element.innerText || '')
    .replace(/\u200B/g, '')  // zero-width space
    .replace(/\n$/, '');     // trailing newline from <br>
}

function normalizeContentText(element) {
  return getDraftEditorText(element);
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
 * Facebookの画像アップロード機能を使用して画像をアップロード
 */
async function uploadImagesToFacebook(images, element) {
  try {
    console.log('[Chrome to X] Facebookの画像アップロード開始');

    const scopeRoot = element?.closest('[role="dialog"]') ||
                      element?.closest('[aria-label][role="group"]') ||
                      document;

    const findFileInput = () => {
      const selectors = [
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="photo"]',
        'input[type="file"][data-testid="add-photo-input"]',
        'input[type="file"][data-testid="media-attachment-input"]'
      ];

      for (const selector of selectors) {
        const input = scopeRoot.querySelector(selector);
        if (input) {
          return input;
        }
      }
      return null;
    };

    let fileInput = findFileInput();

    if (!fileInput) {
      const buttonSelectors = [
        '[aria-label*="写真"]',
        '[aria-label*="画像"]',
        '[aria-label*="メディア"]',
        '[aria-label*="Photo"]',
        '[aria-label*="Image"]',
        '[aria-label*="Media"]',
        '[data-testid="media-attachment-add-photo-button"]',
        '[data-testid="photo-video-button"]'
      ];

      for (const selector of buttonSelectors) {
        const button = scopeRoot.querySelector(selector);
        if (button) {
          console.log('[Chrome to X] Facebookの画像ボタンをクリック:', selector, button);
          button.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          fileInput = findFileInput();
          if (fileInput) {
            break;
          }
        }
      }
    }

    if (!fileInput) {
      console.warn('[Chrome to X] Facebookのファイル入力要素が見つかりません');
      return false;
    }

    console.log('[Chrome to X] Facebookのファイル入力要素を発見:', fileInput);

    const files = [];
    for (const image of images) {
      const response = await fetch(image.base64);
      const blob = await response.blob();
      const fileName = image.name || `image_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: blob.type });
      files.push(file);
    }

    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;

    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    fileInput.dispatchEvent(inputEvent);

    console.log('[Chrome to X] Facebookの画像アップロード成功:', files.length, '枚');

    await new Promise(resolve => setTimeout(resolve, 800));

    return true;
  } catch (error) {
    console.error('[Chrome to X] Facebookの画像アップロードに失敗:', error);
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
  
  // ペーストを実行（Ctrl/Cmd+V をシミュレート）
  if (request.action === 'simulatePaste') {
    console.log('[Chrome to X] ペースト実行');
    
    try {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Ctrl/Cmd+V のキーボードイベントを作成
      const pasteKeyDown = new KeyboardEvent('keydown', {
        key: 'v',
        code: 'KeyV',
        keyCode: 86,
        which: 86,
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
        cancelable: true
      });
      
      const pasteKeyUp = new KeyboardEvent('keyup', {
        key: 'v',
        code: 'KeyV',
        keyCode: 86,
        which: 86,
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
        cancelable: true
      });
      
      // activeElement にイベントを送信
      if (document.activeElement) {
        document.activeElement.dispatchEvent(pasteKeyDown);
        document.activeElement.dispatchEvent(pasteKeyUp);
        console.log('[Chrome to X] activeElement にペーストイベントを送信:', document.activeElement.tagName);
      }
      
      // document にもイベントを送信
      document.dispatchEvent(pasteKeyDown);
      document.dispatchEvent(pasteKeyUp);
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Chrome to X] ペースト実行エラー:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (request.action === 'paste') {
    console.log('[Chrome to X] 貼り付け処理開始');
    const isInIframe = window !== window.top;
    
    // iframe 内で実行されている場合は、そのまま実行
    if (isInIframe) {
      pasteContent(request.text, request.images).then(() => {
        console.log('[Chrome to X] 貼り付け処理完了（iframe内）');
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('[Chrome to X] 貼り付け処理エラー（iframe内）:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    
    // メインフレームで実行されている場合
    pasteContent(request.text, request.images).then(async (success) => {
      // 要素が見つからなかった場合、クリップボード経由で貼り付けを試行
      if (!success) {
        console.log('[Chrome to X] メインフレームで要素が見つからないため、クリップボード経由で貼り付けを試行');
        
        // クリップボードに書き込む
        try {
          await chrome.runtime.sendMessage({
            action: 'writeToClipboard',
            text: request.text
          });
          console.log('[Chrome to X] クリップボードに書き込み成功');
          
          // 少し待つ
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // iframe を探してフォーカスを当てる
          const iframes = document.querySelectorAll('iframe');
          for (const iframe of iframes) {
            try {
              // iframe にフォーカスを当てる
              iframe.focus();
              
              // iframe 内の document にアクセスできる場合、キーボードイベントを送信
              try {
                const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (frameDoc) {
                  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                  
                  // Ctrl/Cmd+V のキーボードイベントを送信
                  const pasteKeyDown = new KeyboardEvent('keydown', {
                    key: 'v',
                    code: 'KeyV',
                    keyCode: 86,
                    which: 86,
                    ctrlKey: !isMac,
                    metaKey: isMac,
                    bubbles: true,
                    cancelable: true
                  });
                  
                  const pasteKeyUp = new KeyboardEvent('keyup', {
                    key: 'v',
                    code: 'KeyV',
                    keyCode: 86,
                    which: 86,
                    ctrlKey: !isMac,
                    metaKey: isMac,
                    bubbles: true,
                    cancelable: true
                  });
                  
                  frameDoc.dispatchEvent(pasteKeyDown);
                  frameDoc.dispatchEvent(pasteKeyUp);
                  
                  console.log('[Chrome to X] iframe 内にキーボードイベントを送信');
                  
                  // 処理が完了するまで少し待つ
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  break;
                }
              } catch (error) {
                // iframe 内の document にアクセスできない場合は、メインフレームから送信
                console.log('[Chrome to X] iframe 内の document にアクセスできないため、メインフレームからキーボードイベントを送信');
                
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                
                const pasteKeyDown = new KeyboardEvent('keydown', {
                  key: 'v',
                  code: 'KeyV',
                  keyCode: 86,
                  which: 86,
                  ctrlKey: !isMac,
                  metaKey: isMac,
                  bubbles: true,
                  cancelable: true
                });
                
                const pasteKeyUp = new KeyboardEvent('keyup', {
                  key: 'v',
                  code: 'KeyV',
                  keyCode: 86,
                  which: 86,
                  ctrlKey: !isMac,
                  metaKey: isMac,
                  bubbles: true,
                  cancelable: true
                });
                
                iframe.dispatchEvent(pasteKeyDown);
                iframe.dispatchEvent(pasteKeyUp);
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                break;
              }
            } catch (error) {
              console.warn('[Chrome to X] iframe へのアクセスに失敗:', error);
              continue;
            }
          }
        } catch (error) {
          console.error('[Chrome to X] クリップボード経由の貼り付けに失敗:', error);
        }
      }
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
  
  // プラットフォームハンドラーの読み込みを確認
  if (typeof window.PlatformHandlers === 'undefined') {
    console.warn('[Chrome to X] プラットフォームハンドラーが読み込まれていません。再試行します...');
    // 少し待ってから再確認
    setTimeout(() => {
      if (typeof window.PlatformHandlers === 'undefined') {
        console.error('[Chrome to X] プラットフォームハンドラーが読み込まれていません');
      } else {
        console.log('[Chrome to X] プラットフォームハンドラーが読み込まれました:', window.PlatformHandlers);
      }
    }, 100);
  }
  
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
  
  // サイドパネルからの画像ドロップを受け取る（Notion用）
  // 手動ドラッグ&ドロップ時に、ドロップ位置を正確に処理する
  try {
    document.addEventListener('drop', async (e) => {
      try {
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        
        const parsedData = JSON.parse(data);
        if (parsedData.type === 'chrome-to-x-image' && parsedData.imageData) {
          console.log('[Chrome to X] サイドパネルからの画像ドロップを検出');
          
          // Notionページの場合
          const platform = detectPlatform();
          if (platform === 'notion') {
            // ドロップ位置の座標を取得（実際のマウス位置を使用）
            const dropX = e.clientX;
            const dropY = e.clientY;
            
            console.log('[Chrome to X] Notion: ドロップ位置:', { x: dropX, y: dropY });
            
            // ドロップ位置の要素を取得
            const dropTarget = document.elementFromPoint(dropX, dropY);
            if (!dropTarget) {
              console.warn('[Chrome to X] Notion: ドロップ位置の要素が見つかりません');
              return;
            }
            
            // Notionのleaf要素を探す（ドロップ位置から）
            const leafElement = dropTarget.closest('[data-content-editable-leaf="true"]') ||
                               dropTarget.querySelector('[data-content-editable-leaf="true"]') ||
                               dropTarget;
            
            console.log('[Chrome to X] Notion: ドロップ先要素:', {
              dropTarget: dropTarget.tagName,
              leafElement: leafElement ? leafElement.tagName : null
            });
            
            // 画像データからFileオブジェクトを作成
            const imageData = parsedData.imageData;
            const base64Data = imageData.base64;
            const response = await fetch(base64Data);
            const blob = await response.blob();
            const file = new File([blob], imageData.name || 'image.png', { type: blob.type });
            
            // DataTransferを作成
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            // ドロップ位置の座標を使用してドラッグ&ドロップイベントを発火
            leafElement.focus({ preventScroll: true });
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // ドロップ位置の座標を使用
            const dragenter = new DragEvent('dragenter', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer,
              clientX: dropX,
              clientY: dropY
            });
            
            const dragover = new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer,
              clientX: dropX,
              clientY: dropY
            });
            dragover.preventDefault();
            
            const drop = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer,
              clientX: dropX,
              clientY: dropY
            });
            drop.preventDefault();
            
            leafElement.dispatchEvent(dragenter);
            await new Promise(resolve => setTimeout(resolve, 10));
            leafElement.dispatchEvent(dragover);
            await new Promise(resolve => setTimeout(resolve, 10));
            const dropResult = leafElement.dispatchEvent(drop);
            
            if (dropResult) {
              console.log('[Chrome to X] Notion: ドラッグ&ドロップで画像を貼り付けました（位置:', dropX, dropY, '）');
            } else {
              console.warn('[Chrome to X] Notion: ドラッグ&ドロップに失敗しました');
            }
            
            // 元のイベントをキャンセル（Notionのデフォルト処理を防ぐ）
            e.preventDefault();
            e.stopPropagation();
          }
        }
      } catch (error) {
        // JSON解析エラーなどは無視（通常のドロップイベントの可能性があるため）
        console.log('[Chrome to X] ドロップイベント処理:', error);
      }
    }, true); // キャプチャフェーズでリスナーを追加
    
    document.addEventListener('dragover', (e) => {
      // dragoverイベントではgetData()が使えないため、typesを確認
      if (e.dataTransfer.types.includes('text/plain')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    }, true);
    
    console.log('[Chrome to X] サイドパネルからの画像ドロップ受信機能を有効化');
  } catch (error) {
    console.error('[Chrome to X] ドロップイベント設定エラー:', error);
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
