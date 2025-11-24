/**
 * デフォルトハンドラー（Google Docs用）
 *
 * 注意: このファイルは元々汎用ハンドラーでしたが、Google Docsでの動作が確認されたため、
 * Google Docs専用として保持しています。
 *
 * 汎用ハンドラーは generic.js を参照してください。
 *
 * Google Docsでの動作実績:
 * - CANVAS要素への対応
 * - Background Script経由のクリップボード操作
 * - 3段階フォールバック（execCommand → ClipboardAPI → DOM操作）
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
   * テキスト挿入の戦略1: execCommand（非推奨だが互換性が高い）
   */
  async function tryExecCommand(element, text, options = {}) {
    try {
      const { dispatchChange = true } = options;

      if (typeof document.execCommand !== 'function') {
        return { success: false, reason: 'execCommand not available' };
      }

      element.focus({ preventScroll: true });
      await new Promise(resolve => setTimeout(resolve, 50));

      const executed = document.execCommand('insertText', false, text);

      if (executed) {
        console.log('[Chrome to X] execCommand で挿入成功');
        if (dispatchChange) {
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return { success: true, method: 'execCommand' };
      }

      return { success: false, reason: 'execCommand returned false' };
    } catch (error) {
      console.warn('[Chrome to X] execCommand エラー:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * テキスト挿入の戦略2: クリップボードAPI経由（最新の推奨方法）
   */
  async function tryClipboardAPI(element, text, options = {}) {
    try {
      const { dispatchChange = true } = options;

      element.focus({ preventScroll: true });
      await new Promise(resolve => setTimeout(resolve, 50));

      // クリップボードにテキストを書き込む（Background Script経由）
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'writeToClipboard',
          text: text
        });

        if (!response || !response.success) {
          console.warn('[Chrome to X] Background経由のクリップボード書き込み失敗');
          return { success: false, reason: 'Background clipboard write failed' };
        }

        console.log('[Chrome to X] Background経由でクリップボードに書き込み成功');
      } catch (bgError) {
        console.warn('[Chrome to X] Background通信エラー:', bgError);
        return { success: false, reason: bgError.message };
      }

      // 擬似的なペーストイベントを発火
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });

      // clipboardDataにテキストを設定
      try {
        pasteEvent.clipboardData.setData('text/plain', text);
        pasteEvent.clipboardData.setData('text', text);
      } catch (e) {
        // 一部のブラウザではsetDataが使えない場合がある
        // その場合はObject.definePropertyで設定
        Object.defineProperty(pasteEvent.clipboardData, 'getData', {
          value: function(type) {
            if (type === 'text/plain' || type === 'text') {
              return text;
            }
            return '';
          },
          writable: false
        });
      }

      element.dispatchEvent(pasteEvent);

      // アプリケーションが処理するまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 150));

      if (dispatchChange) {
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 挿入が成功したか確認
      const afterText = normalizeContentText(element);
      if (afterText.includes(text.trim()) || afterText.length > 0) {
        console.log('[Chrome to X] クリップボードAPI で挿入成功');
        return { success: true, method: 'clipboardAPI' };
      }

      return { success: false, reason: 'Text not found after paste event' };
    } catch (error) {
      console.warn('[Chrome to X] クリップボードAPI エラー:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * テキスト挿入の戦略3: DOM直接操作（最終手段）
   */
  async function tryDirectDOMInsertion(element, text, options = {}) {
    try {
      const {
        inputType = 'insertText',
        dispatchChange = true
      } = options;

      element.focus({ preventScroll: true });
      await new Promise(resolve => setTimeout(resolve, 50));

      const selection = window.getSelection();
      let range;

      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // selectionがない場合、要素の最後にrangeを作成
        range = document.createRange();

        // 要素内にテキストノードがある場合は最後のテキストノードの後ろに
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
          range.setStartAfter(lastTextNode);
          range.collapse(true);
        } else {
          // テキストノードがない場合は要素の中身の最後に
          if (element.childNodes.length > 0) {
            range.setStartAfter(element.childNodes[element.childNodes.length - 1]);
            range.collapse(true);
          } else {
            // 完全に空の場合は要素の中に
            range.selectNodeContents(element);
            range.collapse(false);
          }
        }

        selection.removeAllRanges();
        selection.addRange(range);
      }

      // 選択範囲がある場合は削除
      if (!selection.isCollapsed) {
        range.deleteContents();
      }

      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      // 複数のイベントを発火（より高い互換性のため）
      element.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType,
        data: text
      }));

      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType,
        data: text
      }));

      if (dispatchChange) {
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // React/Vue等のフレームワーク対応: 直接プロパティを変更してイベントを発火
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set ||
                                        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter && (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT')) {
          // Do nothing - already handled above
        }
      } catch (e) {
        // Ignore
      }

      const afterText = normalizeContentText(element);
      const wasInserted = afterText.includes(text.trim()) || afterText.length > 0;

      if (wasInserted) {
        console.log('[Chrome to X] DOM直接操作で挿入成功');
        return { success: true, method: 'directDOM' };
      }

      return { success: false, reason: 'Text not found after DOM insertion' };
    } catch (error) {
      console.error('[Chrome to X] DOM直接操作エラー:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Google Docsにフォーカスを当てる
   */
  async function focusGoogleDocs() {
    try {
      console.log('[Chrome to X] Google Docsへのフォーカスを試行');

      // 1. ウィンドウ全体にフォーカス
      window.focus();

      // 2. Google Docsのエディタ要素を探してクリック
      const editorSelectors = [
        '.kix-canvas-tile-content',
        '.kix-page-canvas',
        '.kix-appview-editor',
        '.docs-editor'
      ];

      for (const selector of editorSelectors) {
        const editor = document.querySelector(selector);
        if (editor) {
          console.log('[Chrome to X] エディタ要素をクリック:', selector);
          editor.click();
          await new Promise(resolve => setTimeout(resolve, 100));

          // ドキュメントがフォーカスされているか確認
          if (document.hasFocus()) {
            console.log('[Chrome to X] Google Docsのフォーカス成功');
            return true;
          }
        }
      }

      // 3. フォールバック: body全体をクリック
      document.body.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      if (document.hasFocus()) {
        console.log('[Chrome to X] Google Docsのフォーカス成功（bodyクリック）');
        return true;
      }

      console.warn('[Chrome to X] Google Docsのフォーカスに失敗');
      return false;
    } catch (error) {
      console.error('[Chrome to X] Google Docsフォーカスエラー:', error);
      return false;
    }
  }

  /**
   * Google Docs用のクリップボード経由挿入（Background script経由）
   */
  async function insertTextForGoogleDocs(text) {
    try {
      console.log('[Chrome to X] Google Docs用のクリップボード挿入を開始');

      // Google Docsに確実にフォーカスを当てる
      const focused = await focusGoogleDocs();
      if (!focused) {
        console.warn('[Chrome to X] フォーカスできなかったが、続行します');
      }

      // Background script経由でクリップボードに書き込む
      console.log('[Chrome to X] Google Docs: Background scriptにメッセージを送信');
      const clipboardResult = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'writeToClipboard', text: text },
          (response) => {
            console.log('[Chrome to X] Google Docs: Background scriptからの応答:', response);
            if (chrome.runtime.lastError) {
              console.error('[Chrome to X] Google Docs: chrome.runtime.lastError:', chrome.runtime.lastError);
            }
            resolve(response);
          }
        );
      });

      if (!clipboardResult || !clipboardResult.success) {
        console.error('[Chrome to X] Google Docs: クリップボード書き込み失敗:', clipboardResult);
        throw new Error(clipboardResult?.error || 'クリップボード書き込み失敗');
      }

      console.log('[Chrome to X] Google Docs: Background経由でクリップボードに書き込み成功');

      // 少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // Ctrl+V (Mac: Cmd+V) を送信
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      const pasteKeyCombo = new KeyboardEvent('keydown', {
        key: 'v',
        code: 'KeyV',
        keyCode: 86,
        which: 86,
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
        cancelable: true
      });

      document.dispatchEvent(pasteKeyCombo);

      const keyUp = new KeyboardEvent('keyup', {
        key: 'v',
        code: 'KeyV',
        keyCode: 86,
        which: 86,
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
        cancelable: true
      });

      document.dispatchEvent(keyUp);

      console.log('[Chrome to X] Google Docs: ペーストキーを送信');

      // Google Docsが処理するのを待つ
      await new Promise(resolve => setTimeout(resolve, 300));

      return true;
    } catch (error) {
      console.error('[Chrome to X] Google Docs用の挿入に失敗:', error);
      return false;
    }
  }

  /**
   * 汎用のテキスト挿入（3段階フォールバック）
   */
  async function insertText(element, text, options = {}) {
    try {
      const {
        inputType = 'insertText',
        dispatchChange = true
      } = options;

      if (!text || text.trim() === '') {
        console.log('[Chrome to X] 空のテキストはスキップ');
        return Promise.resolve(false);
      }

      // 要素が渡されていない場合は、document.activeElementを使用
      if (!element) {
        console.log('[Chrome to X] 要素が指定されていません。document.activeElementを使用します');
        element = document.activeElement;
        if (!element) {
          console.error('[Chrome to X] document.activeElementも見つかりません');
          return Promise.resolve(false);
        }
      }

      // IFRAMEの場合は直接貼り付けできないため、早期リターン
      if (element.tagName === 'IFRAME' || element.tagName === 'FRAME') {
        console.log('[Chrome to X] IFRAMEが検出されました。default.jsでは処理できません（pasteContentで処理されます）');
        return Promise.resolve(false);
      }

      const beforeText = normalizeContentText(element);
      element.focus({ preventScroll: true });

      // Google Docsの場合（CANVAS要素）
      if (element.tagName === 'CANVAS' && window.location.hostname.includes('docs.google.com')) {
        console.log('[Chrome to X] Google Docs (CANVAS)を検出、クリップボード経由で挿入');
        const success = await insertTextForGoogleDocs(text);
        return Promise.resolve(success);
      }

      // TEXTAREAやINPUT要素の場合は直接値を設定（最も確実）
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

      // contenteditable要素の場合は3段階フォールバック
      if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
        console.log('[Chrome to X] contenteditable要素を検出、3段階フォールバック開始');

        // 戦略1: execCommand（互換性重視）
        let result = await tryExecCommand(element, text, { dispatchChange });
        if (result.success) {
          console.log('[Chrome to X] 挿入成功: execCommand');
          return Promise.resolve(true);
        }
        console.log('[Chrome to X] execCommand失敗:', result.reason);

        // 戦略2: クリップボードAPI（最新ブラウザ向け）
        result = await tryClipboardAPI(element, text, { dispatchChange });
        if (result.success) {
          console.log('[Chrome to X] 挿入成功: クリップボードAPI');
          return Promise.resolve(true);
        }
        console.log('[Chrome to X] クリップボードAPI失敗:', result.reason);

        // 戦略3: DOM直接操作（最終手段）
        result = await tryDirectDOMInsertion(element, text, { inputType, dispatchChange });
        if (result.success) {
          console.log('[Chrome to X] 挿入成功: DOM直接操作');
          return Promise.resolve(true);
        }
        console.log('[Chrome to X] DOM直接操作失敗:', result.reason);

        // すべて失敗
        console.error('[Chrome to X] すべての挿入戦略が失敗しました');
        return Promise.resolve(false);
      }

      // その他の要素の場合でも、3段階フォールバックを試す（汎用性を高める）
      console.log('[Chrome to X] 非標準要素を検出。3段階フォールバックを試行:', element.tagName);

      // 戦略1: execCommand
      let result = await tryExecCommand(element, text, { dispatchChange });
      if (result.success) {
        console.log('[Chrome to X] 挿入成功: execCommand (非標準要素)');
        return Promise.resolve(true);
      }

      // 戦略2: クリップボードAPI
      result = await tryClipboardAPI(element, text, { dispatchChange });
      if (result.success) {
        console.log('[Chrome to X] 挿入成功: クリップボードAPI (非標準要素)');
        return Promise.resolve(true);
      }

      // 戦略3: DOM直接操作
      result = await tryDirectDOMInsertion(element, text, { inputType, dispatchChange });
      if (result.success) {
        console.log('[Chrome to X] 挿入成功: DOM直接操作 (非標準要素)');
        return Promise.resolve(true);
      }

      console.warn('[Chrome to X] サポートされていない要素タイプ、すべての戦略が失敗:', element.tagName);
      return Promise.resolve(false);
    } catch (error) {
      console.error('[Chrome to X] 汎用挿入に失敗:', error);
      return Promise.resolve(false);
    }
  }

  /**
   * 画像挿入（汎用化 - Pasteイベント経由）
   */
  async function insertImages(element, images) {
    try {
      if (!images || images.length === 0) {
        return { success: false, reason: 'No images provided' };
      }

      element.focus({ preventScroll: true });
      await new Promise(resolve => setTimeout(resolve, 100));

      let successCount = 0;

      // 画像を1枚ずつ処理
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        try {
          // Base64データURLからBlobを作成
          const base64Data = image.base64;
          const response = await fetch(base64Data);
          const blob = await response.blob();

          // クリップボードAPIが利用可能な場合
          if (navigator.clipboard && navigator.clipboard.write) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
              ]);

              console.log(`[Chrome to X] 画像${i + 1}枚目をクリップボードに書き込み`);

              // 少し待つ
              await new Promise(resolve => setTimeout(resolve, 150));

              // Google Docsの場合は、キーボードイベントを送信
              if (element.tagName === 'CANVAS' && window.location.hostname.includes('docs.google.com')) {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

                const pasteKeyCombo = new KeyboardEvent('keydown', {
                  key: 'v',
                  code: 'KeyV',
                  keyCode: 86,
                  which: 86,
                  ctrlKey: !isMac,
                  metaKey: isMac,
                  bubbles: true,
                  cancelable: true
                });

                document.dispatchEvent(pasteKeyCombo);

                const keyUp = new KeyboardEvent('keyup', {
                  key: 'v',
                  code: 'KeyV',
                  keyCode: 86,
                  which: 86,
                  ctrlKey: !isMac,
                  metaKey: isMac,
                  bubbles: true,
                  cancelable: true
                });

                document.dispatchEvent(keyUp);

                console.log(`[Chrome to X] Google Docs: 画像${i + 1}枚目のペーストキーを送信`);
              } else {
                // その他のプラットフォームはペーストイベントを発火
                const pasteEvent = new ClipboardEvent('paste', {
                  bubbles: true,
                  cancelable: true,
                  clipboardData: new DataTransfer()
                });

                // clipboardDataに画像データを設定
                Object.defineProperty(pasteEvent, 'clipboardData', {
                  value: {
                    items: [{
                      kind: 'file',
                      type: blob.type,
                      getAsFile: () => new File([blob], image.name || `image_${i}.png`, { type: blob.type })
                    }],
                    files: [new File([blob], image.name || `image_${i}.png`, { type: blob.type })]
                  },
                  writable: false
                });

                element.dispatchEvent(pasteEvent);
                console.log(`[Chrome to X] 画像${i + 1}枚目をペーストイベント経由で挿入`);
              }

              successCount++;
            } catch (clipboardError) {
              console.warn(`[Chrome to X] 画像${i + 1}枚目のクリップボード処理失敗:`, clipboardError);
            }
          }

          // 次の画像の前に少し待つ（Google Docsの場合は長め）
          if (i < images.length - 1) {
            const waitTime = (element.tagName === 'CANVAS' && window.location.hostname.includes('docs.google.com')) ? 500 : 200;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (imageError) {
          console.error(`[Chrome to X] 画像${i + 1}枚目の処理エラー:`, imageError);
        }
      }

      if (successCount > 0) {
        console.log(`[Chrome to X] ${successCount}枚の画像を挿入しました`);
        return { success: true, count: successCount };
      }

      return { success: false, reason: 'No images were inserted' };
    } catch (error) {
      console.error('[Chrome to X] 画像挿入エラー:', error);
      return { success: false, reason: error.message };
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
    insertImages: insertImages,
    supports: supports
  };

  console.log('[Chrome to X] デフォルトハンドラー（Google Docs用として保持）を読み込みました');
})();
