/**
 * X (旧Twitter) 用のテキスト貼り付けハンドラー
 * Draft.jsエディタに対応
 */

(function() {
  'use strict';

  /**
   * テキストを正規化（改行やゼロ幅スペースを除去）
   */
  function normalizeContentText(element) {
    if (!element) return '';
    return (element.textContent || element.innerText || '')
      .replace(/\u200B/g, '')  // zero-width space
      .replace(/\n$/, '');     // trailing newline from <br>
  }

  /**
   * contenteditable要素に直接テキストを挿入
   */
  function insertTextDirectly(element, text, options = {}) {
    try {
      const {
        inputType = 'insertText',
        dispatchChange = true
      } = options;

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
      
      return true;
    } catch (error) {
      console.error('[Chrome to X] 直接挿入に失敗:', error);
      return false;
    }
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

  /**
   * XのDraft.jsエディタ専用のテキスト挿入
   */
  function insertTextToDraftEditor(element, text) {
    return new Promise(async (resolve) => {
      try {
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
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const defaultHandler = getDefaultHandler();
        const insertTextDirectly = defaultHandler ? defaultHandler.insertTextDirectly : null;
        const dispatchSyntheticPaste = defaultHandler ? defaultHandler.dispatchSyntheticPaste : null;
        
        let directSuccess = false;
        if (insertTextDirectly) {
          directSuccess = insertTextDirectly(element, text, {
            inputType: 'insertFromPaste'
          });
        }

        let syntheticPasteDispatched = false;
        if (!directSuccess && dispatchSyntheticPaste) {
          syntheticPasteDispatched = dispatchSyntheticPaste(element, text);
        }

        setTimeout(() => {
          const afterText = normalizeContentText(element);
          const wasInserted = afterText.includes(text) || 
                             afterText.length > beforeText.length ||
                             (beforeText.length === 0 && afterText.length > 0);
          
          console.log('[Chrome to X] X貼り付け結果:', { 
            beforeText, 
            afterText, 
            wasInserted,
            directSuccess,
            syntheticPasteDispatched
          });

          resolve(wasInserted || directSuccess || syntheticPasteDispatched);
        }, 400);
      } catch (error) {
        console.error('[Chrome to X] XのDraft.jsエディタへの挿入に失敗:', error);
        resolve(false);
      }
    });
  }

  /**
   * X用のテキスト挿入
   */
  function insertText(element, text, options = {}) {
    // XのDraft.jsエディタの場合は非同期処理
    const isDraftEditor = element.classList.contains('public-DraftEditor-content') || 
                         element.closest('[data-testid="tweetTextarea_0"]');
    
    if (isDraftEditor) {
      return insertTextToDraftEditor(element, text);
    } else {
      // 通常のcontenteditable要素の場合
      return Promise.resolve(insertTextDirectly(element, text, options));
    }
  }

  /**
   * このハンドラーが要素をサポートするかどうか
   */
  function supports(element) {
    const xTextArea = element.closest('[data-testid="tweetTextarea_0"]');
    return !!xTextArea || element.classList.contains('public-DraftEditor-content');
  }

  // グローバルオブジェクトに登録
  if (typeof window.PlatformHandlers === 'undefined') {
    window.PlatformHandlers = {};
  }
  
  window.PlatformHandlers.x = {
    insertText: insertText,
    supports: supports
  };
})();

