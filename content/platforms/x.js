/**
 * X (旧Twitter) 用のテキスト貼り付けハンドラー
 * Draft.jsエディタに対応
 */

(function() {
  'use strict';

  /**
   * テキストを正規化（改行を保持）
   */
  function normalizeContentText(element) {
    if (!element) return '';
    
    // Draft.jsエディタの場合、改行を保持する必要がある
    const isDraftEditor = element.classList.contains('public-DraftEditor-content') || 
                         element.closest('[data-testid="tweetTextarea_0"]');
    
    if (isDraftEditor) {
      // Draft.jsエディタでは、data-block="true"を持つ<div>要素が改行を表す
      let lineDivs = Array.from(element.querySelectorAll('div[data-block="true"]'));
      if (lineDivs.length === 0) {
        // フォールバック: 直接の子要素の<div>を使用
        lineDivs = Array.from(element.children).filter(child => child.tagName === 'DIV');
      }
      if (lineDivs.length > 0) {
        // Draft.jsのブロック構造を使用
        let text = '';
        lineDivs.forEach((div, index) => {
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

  /**
   * Draft.js用にテキストをHTMLに変換（改行をdivとして表現）
   */
  function convertTextToDraftHtml(text) {
    if (!text) return '';

    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const lines = escaped.split('\n');
    if (lines.length === 0) {
      return '<div><br></div>';
    }

    return lines.map(line => {
      if (line === '') {
        return '<div><br></div>';
      }
      return `<div>${line}</div>`;
    }).join('');
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
          console.log('[Chrome to X] X直接挿入完了 (execCommand):', { beforeText, afterText, wasInserted });
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
      
      console.log('[Chrome to X] X直接挿入完了:', { beforeText, afterText, wasInserted });
      return wasInserted;
    } catch (error) {
      console.error('[Chrome to X] 直接挿入に失敗:', error);
      return false;
    }
  }

  /**
   * 擬似的なPasteイベントを発火してDraft.jsにテキストを挿入させる
   */
  function dispatchSyntheticPaste(element, text, html) {
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      dataTransfer.setData('text', text);
      if (html) {
        dataTransfer.setData('text/html', html);
      }

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });

      return element.dispatchEvent(pasteEvent);
    } catch (error) {
      console.error('[Chrome to X] 擬似Pasteイベントの生成に失敗:', error);
      return false;
    }
  }

  /**
   * XのDraft.jsエディタ専用のテキスト挿入
   * 改行を<div>要素に変換して、Draft.jsの構造に合わせて挿入する
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
        
        // 既存のテキストがある場合は、全選択してから貼り付ける
        // execCommand('selectAll')を使用して、Draft.jsの内部状態を壊さないようにする
        if (beforeText.length > 0 && typeof document.execCommand === 'function') {
          const selectAllSuccess = document.execCommand('selectAll', false, null);
          if (selectAllSuccess) {
            // 全選択が成功したら、少し待ってから貼り付け
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        // 改行を含むテキストをDraft.jsの構造に合わせて処理
        // Draft.jsでは、改行は<div>要素として表現される
        const lines = text.split('\n');
        
        // まず、擬似Pasteイベントを試す（最も確実な方法）
        let pasteSuccess = false;
        let pasteHandled = false;
        
        const draftHtml = convertTextToDraftHtml(text);

        if (dispatchSyntheticPaste) {
          // Pasteイベントを発火
          pasteSuccess = dispatchSyntheticPaste(element, text, draftHtml);
          
          // Pasteイベントが発火された後、Draft.jsが処理するのを待つ
          // 複数回チェックして、テキストが挿入されるまで待つ
          let pasteHandledCheck = false;
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // DOM構造を直接確認（Draft.jsが<div data-block="true">要素を追加しているか）
            let lineDivs = Array.from(element.querySelectorAll('div[data-block="true"]'));
            if (lineDivs.length === 0) {
              lineDivs = Array.from(element.children).filter(child => child.tagName === 'DIV');
            }
            const afterPasteText = normalizeContentText(element);
            
            // 改行を保持したまま比較するための関数
            const normalizeForComparison = (str) => {
              return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
            };
            
            const normalizedOriginal = normalizeForComparison(text);
            const normalizedAfter = normalizeForComparison(afterPasteText);
            
            // テキストが挿入されたか確認
            const originalLines = normalizedOriginal.split('\n');
            const afterLines = normalizedAfter.split('\n');
            
            // 改行を含むテキストが正しく挿入されたか確認
            const hasCorrectNewlines = afterLines.length >= originalLines.length;
            const hasAllLines = originalLines.every((line, idx) => {
              if (line.trim() === '') return true; // 空行はスキップ
              return afterLines.some(afterLine => afterLine.includes(line.trim()));
            });
            
            const textInserted = afterPasteText.length > beforeText.length && 
                                (normalizedAfter.includes(normalizedOriginal) || 
                                 (hasCorrectNewlines && hasAllLines));
            
            // <div>要素が追加されているかも確認
            const hasDivStructure = lineDivs.length >= Math.max(originalLines.length, 1);
            
            if (textInserted || hasDivStructure) {
              pasteHandledCheck = true;
              console.log('[Chrome to X] Pasteイベントでテキストが挿入されました（改行保持）', {
                attempt: i + 1,
                afterPasteText: afterPasteText.substring(0, 100),
                lineDivsCount: lineDivs.length,
                originalLines: originalLines.length,
                afterLines: afterLines.length
              });
              break;
            }
          }
          
          if (pasteHandledCheck) {
            pasteHandled = true;
          } else {
            console.log('[Chrome to X] Pasteイベントではテキストが挿入されませんでした');
          }
        }
        
        // Pasteイベントで処理されなかった場合のみ、直接DOM操作を試す
        if (!pasteHandled) {
          // 再度テキストを確認（Pasteイベントが非同期で処理された可能性がある）
          const currentText = normalizeContentText(element);
          const normalizedCurrent = currentText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
          const normalizedOriginal = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
          
          // 既に改行を含むテキストが挿入されている場合は、DOM操作をスキップ
          const currentLines = normalizedCurrent.split('\n');
          const originalLines = normalizedOriginal.split('\n');
          
          const alreadyHasCorrectText = currentLines.length >= originalLines.length &&
                                       normalizedCurrent.includes(normalizedOriginal);
          
          if (alreadyHasCorrectText) {
            console.log('[Chrome to X] 既に正しいテキストが挿入されているため、DOM操作をスキップします');
            pasteHandled = true;
          } else {
            console.log('[Chrome to X] DOM操作でテキストを挿入します');
            
            const selection = window.getSelection();
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
            
            // 改行がある場合は、各行を<div>要素として挿入
            if (lines.length > 1) {
              const fragment = document.createDocumentFragment();
              lines.forEach((line, index) => {
                const div = document.createElement('div');
                if (line === '') {
                  // 空行の場合は<br>タグを追加
                  div.appendChild(document.createElement('br'));
                } else {
                  div.textContent = line;
                }
                fragment.appendChild(div);
              });
              
              range.insertNode(fragment);
              
              // カーソル位置を最後に設定
              const lastDiv = fragment.lastChild;
              if (lastDiv) {
                range.setStartAfter(lastDiv);
                range.collapse(true);
              }
            } else {
              // 改行がない場合は通常のテキストノードを挿入
              const textNode = document.createTextNode(text);
              range.insertNode(textNode);
              range.setStartAfter(textNode);
              range.collapse(true);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
            
            // input/change イベントを発火
            element.dispatchEvent(new InputEvent('input', { 
              bubbles: true, 
              cancelable: true,
              inputType: 'insertFromPaste',
              data: text
            }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        }

        // 結果を確認（Draft.jsが非同期で処理する可能性を考慮）
        setTimeout(() => {
          const afterText = normalizeContentText(element);
          const wasInserted = afterText.includes(text) || 
                             afterText.length > beforeText.length ||
                             (beforeText.length === 0 && afterText.length > 0);
          
          console.log('[Chrome to X] X貼り付け結果:', { 
            beforeText, 
            afterText, 
            wasInserted,
            pasteSuccess,
            pasteHandled,
            linesCount: lines.length
          });

          resolve(wasInserted || pasteHandled);
        }, 500);
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

