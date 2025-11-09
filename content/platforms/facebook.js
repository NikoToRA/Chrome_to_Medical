/**
 * Facebook用のテキスト貼り付けハンドラー
 * 改行を<div>要素に変換してHTMLとして挿入
 * Facebookのcontenteditable要素は<div>要素で改行を表現する
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
   * テキストをHTMLに変換（改行を<div>要素に変換）
   * Facebookは<div>要素で改行を表現する
   */
  function convertTextToHtml(text) {
    if (!text) return '';
    
    // HTMLエスケープ（XSS対策）
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // 改行文字で分割
    const lines = escaped.split('\n');
    
    // 各行を<div>要素で囲む（Facebookの形式）
    const htmlParts = lines.map((line, index) => {
      if (index === 0 && line === '' && lines.length > 1) {
        // 最初の行が空で、複数行ある場合は空のdivを追加
        return '<div><br></div>';
      } else if (line === '' && index < lines.length - 1) {
        // 中間の空行は<br>を含むdiv
        return '<div><br></div>';
      } else if (line === '' && index === lines.length - 1) {
        // 最後の行が空の場合は何も追加しない
        return '';
      } else {
        // 通常の行はテキストを含むdiv
        return `<div>${line}</div>`;
      }
    });
    
    return htmlParts.join('');
  }

  /**
   * Facebook用のテキスト挿入
   * 改行文字を<div>要素に変換してHTMLとして挿入
   */
  async function insertText(element, text, options = {}) {
    try {
      const {
        inputType = 'insertFromPaste',
        dispatchChange = true
      } = options;

      if (!text || text.trim() === '') {
        console.log('[Chrome to X] Facebook: 空のテキストはスキップ');
        return Promise.resolve(false);
      }

      const beforeText = normalizeContentText(element);
      element.focus({ preventScroll: true });
      
      // 少し待ってから処理（フォーカスが安定するのを待機）
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 改行文字を<div>要素に変換（HTMLエスケープも含む）
      const htmlText = convertTextToHtml(text);
      
      console.log('[Chrome to X] Facebook: 改行を<div>要素に変換', { 
        originalText: text,
        originalLength: text.length, 
        htmlLength: htmlText.length,
        hasNewlines: text.includes('\n'),
        htmlPreview: htmlText.substring(0, 200)
      });
      
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
      
      // execCommand('insertHTML')を試す（Facebookがサポートしている場合）
      if (typeof document.execCommand === 'function') {
        try {
          // 選択範囲を設定
          selection.removeAllRanges();
          selection.addRange(range);
          
          const executed = document.execCommand('insertHTML', false, htmlText);
          if (executed) {
            console.log('[Chrome to X] Facebook: execCommand(insertHTML)で挿入成功');
            
            // カーソル位置を更新
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
            if (dispatchChange) {
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            const afterText = normalizeContentText(element);
            const wasInserted = afterText.length >= beforeText.length;
            
            console.log('[Chrome to X] Facebook用HTML挿入完了:', { beforeText, afterText, wasInserted });
            return Promise.resolve(wasInserted);
          }
        } catch (error) {
          console.warn('[Chrome to X] Facebook: execCommand(insertHTML)に失敗、フォールバックを使用:', error);
        }
      }
      
      // フォールバック: 一時的なdiv要素を作成してHTMLを設定
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlText;
      
      // フラグメントを作成してノードを挿入
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      // フラグメントが空でないことを確認
      if (fragment.childNodes.length === 0) {
        console.warn('[Chrome to X] Facebook: フラグメントが空です');
        return Promise.resolve(false);
      }
      
      range.insertNode(fragment);
      
      // カーソル位置を更新（最後のノードの後に）
      const lastNode = fragment.lastChild;
      if (lastNode) {
        // 最後のノードがテキストノードの場合は、その末尾にカーソルを設定
        if (lastNode.nodeType === Node.TEXT_NODE) {
          range.setStart(lastNode, lastNode.textContent.length);
        } else {
          // div要素の場合は、その中にカーソルを設定
          if (lastNode.nodeType === Node.ELEMENT_NODE && lastNode.tagName === 'DIV') {
            range.setStart(lastNode, lastNode.childNodes.length);
          } else {
            range.setStartAfter(lastNode);
          }
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
      if (dispatchChange) {
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      const afterText = normalizeContentText(element);
      const wasInserted = afterText.length >= beforeText.length;
      
      console.log('[Chrome to X] Facebook用HTML挿入完了:', { beforeText, afterText, wasInserted });
      return Promise.resolve(wasInserted);
    } catch (error) {
      console.error('[Chrome to X] Facebook用の挿入に失敗:', error);
      return Promise.resolve(false);
    }
  }

  /**
   * このハンドラーが要素をサポートするかどうか
   */
  function supports(element) {
    return element.isContentEditable || element.getAttribute('contenteditable') === 'true';
  }

  // グローバルオブジェクトに登録
  if (typeof window.PlatformHandlers === 'undefined') {
    window.PlatformHandlers = {};
  }
  
  window.PlatformHandlers.facebook = {
    insertText: insertText,
    supports: supports
  };
})();

