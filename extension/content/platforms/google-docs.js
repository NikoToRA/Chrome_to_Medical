/**
 * Google Docs用のテキスト・画像貼り付けハンドラー
 * Google DocsはKixエディタという独自エンジンを使用しているため、
 * クリップボードAPI経由でのペーストが最も確実
 */

console.log('[Chrome to X] google-docs.js の読み込み開始');

(function() {
  'use strict';

  console.log('[Chrome to X] google-docs.js の即時関数内に入りました');

  /**
   * Google Docsのエディタ要素を取得
   */
  function getGoogleDocsEditor() {
    // Google Docsのエディタ要素を探す（複数のパターンを試す）
    const selectors = [
      '.kix-canvas-tile-content',
      '.kix-page-canvas',
      '.kix-appview-editor',
      '.docs-editor',
      '.kix-page',
      'iframe.docs-texteventtarget-iframe'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[Chrome to X] Google Docsエディタを発見:', selector, element);
        return element;
      }
    }

    // iframeの中も確認
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          for (const selector of selectors) {
            const element = iframeDoc.querySelector(selector);
            if (element) {
              console.log('[Chrome to X] Google Docsエディタをiframe内で発見:', selector, element);
              return element;
            }
          }
        }
      } catch (e) {
        // クロスオリジンの場合はスキップ
        continue;
      }
    }

    console.warn('[Chrome to X] Google Docsエディタが見つかりません');
    return null;
  }

  /**
   * 選択範囲の管理
   */
  let selectionTrackingInitialized = false;
  let savedSelection = null;
  let savedSelectionTimestamp = 0;

  function saveSelection(range, iframeDocument) {
    try {
      if (!range || !iframeDocument) return;
      savedSelection = {
        range: range.cloneRange(),
        document: iframeDocument
      };
      savedSelectionTimestamp = Date.now();
    } catch (error) {
      console.warn('[Chrome to X] Google Docs: 選択範囲の保存に失敗:', error);
    }
  }

  function captureIframeSelection() {
    try {
      const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
      if (!iframe) return;
      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframe.contentDocument;
      if (!iframeWindow || !iframeDocument) return;
      const selection = iframeWindow.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!range) return;
      saveSelection(range, iframeDocument);
    } catch (error) {
      console.warn('[Chrome to X] Google Docs: 選択範囲の取得に失敗:', error);
    }
  }

  function attachIframeSelectionListeners(iframe) {
    try {
      if (!iframe) return;
      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframe.contentDocument;
      if (!iframeWindow || !iframeDocument) return;

      const handler = () => captureIframeSelection();

      iframeDocument.removeEventListener('selectionchange', handler);
      iframeDocument.addEventListener('selectionchange', handler);

      iframeWindow.removeEventListener('mouseup', handler);
      iframeWindow.addEventListener('mouseup', handler);

      iframeWindow.removeEventListener('keyup', handler);
      iframeWindow.addEventListener('keyup', handler);

      handler();
    } catch (error) {
      console.warn('[Chrome to X] Google Docs: 選択リスナーの設定に失敗:', error);
    }
  }

  function setupSelectionTracking() {
    if (selectionTrackingInitialized) return;
    selectionTrackingInitialized = true;

    document.addEventListener('selectionchange', () => {
      captureIframeSelection();
    });

    const setupIframe = () => {
      const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
      if (iframe) {
        attachIframeSelectionListeners(iframe);
      }
    };

    const observer = new MutationObserver(() => setupIframe());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setupIframe();
  }

  function restoreSavedSelection(iframeWindow, iframeDocument, targetElement) {
    try {
      if (!savedSelection || !savedSelection.range) return false;
      if (savedSelection.document !== iframeDocument) return false;

      const selection = iframeWindow.getSelection();
      if (!selection) return false;

      const range = savedSelection.range.cloneRange();
      if (targetElement && !targetElement.contains(range.startContainer)) {
        return false;
      }

      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch (error) {
      console.warn('[Chrome to X] Google Docs: 選択範囲の復元に失敗:', error);
      return false;
    }
  }

  /**
   * Google Docsにフォーカスを当てる
   */
  async function focusGoogleDocs() {
    try {
      // 1. ドキュメント全体にフォーカス
      window.focus();

      // 2. エディタ要素を探してクリック
      const editor = getGoogleDocsEditor();
      if (editor) {
        editor.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      }

      // 3. フォールバック: ドキュメント本体をクリック
      const canvas = document.querySelector('.kix-canvas-tile-content') ||
                    document.querySelector('.kix-page-canvas');
      if (canvas) {
        canvas.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Chrome to X] Google Docsへのフォーカスに失敗:', error);
      return false;
    }
  }

  /**
   * Google Docsでの確実なペースト: クリップボードとショートカットの組み合わせ
   */

  function getEventTargetIframe() {
    return document.querySelector('iframe.docs-texteventtarget-iframe');
  }

  function getPasteTargetElement(iframeDocument) {
    if (!iframeDocument) {
      return null;
    }

    const active = iframeDocument.activeElement;
    if (active && active !== iframeDocument.body) {
      return active;
    }

    const editable =
      iframeDocument.querySelector('div[contenteditable="true"][aria-multiline="true"]') ||
      iframeDocument.querySelector('#docs-texteventtarget-descendant') ||
      iframeDocument.querySelector('[contenteditable="true"]');

    if (editable) {
      return editable;
    }

    const textArea = iframeDocument.querySelector('textarea');
    if (textArea) {
      return textArea;
    }

    return iframeDocument.body || null;
  }

  function waitForPasteAcknowledge(targetDocument, timeout = 1200) {
    return new Promise(resolve => {
      if (!targetDocument) {
        resolve(false);
        return;
      }

      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        targetDocument.removeEventListener('input', onInput, true);
        targetDocument.removeEventListener('paste', onInput, true);
        if (timer) {
          clearTimeout(timer);
        }
      };

      const onInput = () => {
        cleanup();
        resolve(true);
      };

      targetDocument.addEventListener('input', onInput, true);
      targetDocument.addEventListener('paste', onInput, true);

      const timer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);
    });
  }

  function dispatchPasteShortcut(iframeWindow) {
    if (!iframeWindow) return;
    const isMac = navigator.platform.toUpperCase().includes('MAC');

    const keyDown = new iframeWindow.KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      keyCode: 86,
      which: 86,
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
      cancelable: true
    });

    const keyUp = new iframeWindow.KeyboardEvent('keyup', {
      key: 'v',
      code: 'KeyV',
      keyCode: 86,
      which: 86,
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
      cancelable: true
    });

    try {
      iframeWindow.document.dispatchEvent(keyDown);
      iframeWindow.document.dispatchEvent(keyUp);
    } catch (error) {
      console.warn('[Chrome to X] Google Docs: ショートカット送信に失敗', error);
    }
  }

  /**
   * クリップボードAPIを使用してテキストを貼り付け
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function insertTextViaClipboard(text, options = {}) {
    try {
      const {
        maxAttempts = 3,
        acknowledgeTimeout = 1500,
        betweenAttemptsDelay = 250
      } = options;

      // フォーカスを確保
      await focusGoogleDocs();

      const eventTargetIframe = getEventTargetIframe();
      if (!eventTargetIframe) {
        console.warn('[Chrome to X] Google Docs: イベントターゲットiframeが見つかりません');
        return { success: false, reason: 'eventTargetIframeNotFound' };
      }

      const iframeWindow = eventTargetIframe.contentWindow;
      const iframeDocument = eventTargetIframe.contentDocument;

      if (!iframeWindow || !iframeDocument) {
        console.warn('[Chrome to X] Google Docs: iframeのドキュメントにアクセスできません');
        return { success: false, reason: 'iframeDocumentUnavailable' };
      }

      setupSelectionTracking();

      let targetElement = getPasteTargetElement(iframeDocument);
      if (!targetElement) {
        console.warn('[Chrome to X] Google Docs: 貼り付け先要素が特定できません');
        return { success: false, reason: 'targetElementNotFound' };
      }

      const ensureFocus = async () => {
        window.focus();
        iframeWindow.focus();
        if (typeof targetElement.focus === 'function') {
          targetElement.focus({ preventScroll: true });
        }
        await delay(40);
      };

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await ensureFocus();

        const selection = iframeWindow.getSelection();
        if (selection && selection.rangeCount > 0) {
          saveSelection(selection.getRangeAt(0), iframeDocument);
        }

        console.log(`[Chrome to X] Google Docs: クリップボード書き込みを試行 (${attempt}/${maxAttempts})`);
        const clipboardResult = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: 'writeToClipboard', text },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error('[Chrome to X] Google Docs: chrome.runtime.lastError:', chrome.runtime.lastError);
              }
              resolve(response);
            }
          );
        });

        if (!clipboardResult || !clipboardResult.success) {
          console.warn('[Chrome to X] Google Docs: クリップボード書き込み失敗', clipboardResult);
          continue;
        }

        const acknowledgePromise = waitForPasteAcknowledge(iframeDocument, acknowledgeTimeout);
        dispatchPasteShortcut(iframeWindow);

        const acknowledged = await acknowledgePromise;
        if (acknowledged) {
          console.log('[Chrome to X] Google Docs: ペースト入力が検知されました');
          const restored = restoreSavedSelection(iframeWindow, iframeDocument, targetElement);
          if (restored) {
            const sel = iframeWindow.getSelection();
            if (sel && sel.rangeCount > 0) {
              saveSelection(sel.getRangeAt(0), iframeDocument);
            }
          }
          return { success: true, method: 'clipboardShortcut' };
        }

        console.warn(`[Chrome to X] Google Docs: ペーストの反応がありません (attempt ${attempt})`);

        // 再試行前にターゲット要素を取り直す（Docsが要素を差し替えることがある）
        await delay(betweenAttemptsDelay);
        targetElement = getPasteTargetElement(iframeDocument);
      }

      console.error('[Chrome to X] Google Docs: ペーストを検知できませんでした');
      return { success: false, reason: 'pasteNotAcknowledged' };
    } catch (error) {
      console.error('[Chrome to X] Google Docs: クリップボード経由のテキスト挿入に失敗:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * テキスト挿入（Google Docs専用）
   */
  async function insertText(element, text, options = {}) {
    try {
      if (!text || text.trim() === '') {
        console.log('[Chrome to X] Google Docs: 空のテキストはスキップ');
        return Promise.resolve(false);
      }

      console.log('[Chrome to X] Google Docs: テキスト挿入開始');

      const result = await insertTextViaClipboard(text);

      if (result.success) {
        console.log('[Chrome to X] Google Docs: テキスト挿入成功');
        return Promise.resolve(true);
      }

      console.error('[Chrome to X] Google Docs: テキスト挿入失敗:', result.reason);
      return Promise.resolve(false);
    } catch (error) {
      console.error('[Chrome to X] Google Docs: テキスト挿入エラー:', error);
      return Promise.resolve(false);
    }
  }

  /**
   * 画像挿入（Google Docs専用）
   */
  async function insertImages(element, images) {
    try {
      if (!images || images.length === 0) {
        return { success: false, reason: 'No images provided' };
      }

      console.log('[Chrome to X] Google Docs: 画像挿入開始 -', images.length, '枚');

      // フォーカスを確保
      await focusGoogleDocs();

      let successCount = 0;

      // 画像を1枚ずつクリップボード経由で貼り付け
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        try {
          // Background script経由でクリップボードに書き込む（フォーカス不要）
          const clipboardResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: 'writeToClipboard', imageData: image.base64 },
              (response) => {
                resolve(response);
              }
            );
          });

          if (!clipboardResult || !clipboardResult.success) {
            throw new Error(clipboardResult?.error || 'クリップボード書き込み失敗');
          }

          console.log(`[Chrome to X] Google Docs: Background経由で画像${i + 1}枚目をクリップボードに書き込み`);

          // 少し待つ
          await new Promise(resolve => setTimeout(resolve, 150));

          // Ctrl+V (Mac: Cmd+V) を送信してペースト
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

          successCount++;

          // 次の画像の前に待つ（Google Docsが処理する時間を確保）
          if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (imageError) {
          console.error(`[Chrome to X] Google Docs: 画像${i + 1}枚目の処理エラー:`, imageError);
        }
      }

      if (successCount > 0) {
        console.log(`[Chrome to X] Google Docs: ${successCount}枚の画像を挿入しました`);
        return { success: true, count: successCount };
      }

      return { success: false, reason: 'No images were inserted' };
    } catch (error) {
      console.error('[Chrome to X] Google Docs: 画像挿入エラー:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * このハンドラーが要素をサポートするかどうか
   */
  function supports(element) {
    // Google Docsかどうかを判定
    const isGoogleDocs = window.location.hostname.includes('docs.google.com');
    const hasGoogleDocsEditor = !!getGoogleDocsEditor();
    return isGoogleDocs && hasGoogleDocsEditor;
  }

  // グローバルオブジェクトに登録
  console.log('[Chrome to X] Google Docs: ハンドラー登録前:', typeof window.PlatformHandlers, window.PlatformHandlers);

  if (typeof window.PlatformHandlers === 'undefined') {
    window.PlatformHandlers = {};
    console.log('[Chrome to X] Google Docs: window.PlatformHandlers を新規作成');
  }

  window.PlatformHandlers['google-docs'] = {
    insertText: insertText,
    insertImages: insertImages,
    supports: supports,
    getEditor: getGoogleDocsEditor
  };

  console.log('[Chrome to X] Google Docsハンドラーを読み込みました');
  console.log('[Chrome to X] Google Docs: ハンドラー登録後:', Object.keys(window.PlatformHandlers));
})();
