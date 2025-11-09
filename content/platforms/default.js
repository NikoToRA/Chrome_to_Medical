/**
 * 汎用（デフォルト）のテキスト貼り付けハンドラー
 * 通常のtextarea、input、contenteditable要素に対応
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

      const beforeText = normalizeContentText(element);

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
      let range;
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
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
      
      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        range.deleteContents();
      }
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
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
   * 汎用のテキスト挿入
   */
  function insertText(element, text, options = {}) {
    try {
      const {
        inputType = 'insertText',
        dispatchChange = true
      } = options;

      const beforeText = normalizeContentText(element);
      element.focus({ preventScroll: true });
      
      // TEXTAREAやINPUT要素の場合
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;
        const value = element.value;
        
        element.value = value.substring(0, start) + text + value.substring(end);
        
        const newPosition = start + text.length;
        element.setSelectionRange(newPosition, newPosition);
        
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('[Chrome to X] テキストエリア/inputに貼り付け完了');
        return Promise.resolve(true);
      }
      
      // contenteditable要素の場合
      if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
        return Promise.resolve(insertTextDirectly(element, text, options));
      }
      
      return Promise.resolve(false);
    } catch (error) {
      console.error('[Chrome to X] 汎用挿入に失敗:', error);
      return Promise.resolve(false);
    }
  }

  /**
   * このハンドラーが要素をサポートするかどうか
   */
  function supports(element) {
    return true; // デフォルトハンドラーは常にtrueを返す（フォールバック）
  }

  // グローバルオブジェクトに登録
  if (typeof window.PlatformHandlers === 'undefined') {
    window.PlatformHandlers = {};
  }
  
  window.PlatformHandlers.default = {
    insertText: insertText,
    supports: supports,
    insertTextDirectly: insertTextDirectly,
    dispatchSyntheticPaste: dispatchSyntheticPaste
  };
})();

