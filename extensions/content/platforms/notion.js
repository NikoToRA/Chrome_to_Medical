console.log('[Chrome to X] notion.js の読み込み開始');

(function() {
  'use strict';

  console.log('[Chrome to X] notion.js の即時関数内に入りました');

  const NOTION_HOST_PATTERN = /(?:^|\.)notion\.so$|(?:^|\.)notion\.site$/;

  function delay(ms = 50) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isEditableElement(element) {
    if (!element) return false;
    if (element.tagName === 'TEXTAREA') return true;
    if (element.tagName === 'INPUT') {
      const type = (element.type || '').toLowerCase();
      return type === '' || type === 'text' || type === 'search';
    }
    if (element.isContentEditable) return true;
    const attr = typeof element.getAttribute === 'function'
      ? element.getAttribute('contenteditable')
      : null;
    return attr && attr.toLowerCase() === 'true';
  }

  function findNotionLeaf(element) {
    const doc = (element && element.ownerDocument) ? element.ownerDocument : document;
    const root = (() => {
      if (!element) return null;
      if (element.getAttribute && element.getAttribute('data-content-editable-root') === 'true') {
        return element;
      }
      if (typeof element.closest === 'function') {
        return element.closest('[data-content-editable-root="true"]');
      }
      return null;
    })();

    if (!root) {
      return null;
    }

    const selection = typeof doc.getSelection === 'function' ? doc.getSelection() : null;
    if (selection && selection.rangeCount > 0) {
      const focusNode = selection.focusNode;
      const focusElement = focusNode && focusNode.nodeType === Node.ELEMENT_NODE
        ? focusNode
        : focusNode && focusNode.parentElement
          ? focusNode.parentElement
          : null;

      if (focusElement && typeof focusElement.closest === 'function') {
        const leafFromSelection = focusElement.closest('[data-content-editable-leaf="true"][contenteditable="true"]');
        if (leafFromSelection && root.contains(leafFromSelection)) {
          return leafFromSelection;
        }
      }
    }

    const active = doc.activeElement;
    if (
      active &&
      root.contains(active) &&
      active.matches &&
      active.matches('[contenteditable="true"][data-content-editable-leaf="true"]')
    ) {
      return active;
    }

    const fallbackLeaf = root.querySelector('[contenteditable="true"][data-content-editable-leaf="true"]');
    if (fallbackLeaf) {
      return fallbackLeaf;
    }

    return root;
  }

  function normalizeTargetElement(element) {
    const notionLeaf = findNotionLeaf(element);
    if (notionLeaf) {
      return notionLeaf;
    }

    if (isEditableElement(element)) {
      return element;
    }

    const active = document.activeElement;
    if (isEditableElement(active)) {
      return active;
    }

    const selectors = [
      '[contenteditable="true"][data-content-editable-leaf="true"]',
      '[contenteditable="true"][role="textbox"]',
      '[role="textbox"][aria-multiline="true"]',
      '[data-block-id][contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const candidate = document.querySelector(selector);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  function attachClipboardData(event, dataTransfer, text = '') {
    if (!event) return;
    if (dataTransfer) {
      try {
        Object.defineProperty(event, 'clipboardData', {
          value: dataTransfer,
          configurable: true
        });
        return;
      } catch (error) {
        // noop
      }
    }
    const fallbackClipboard = {
      getData: (type) => {
        if (type === 'text/plain' || type === 'text') {
          return text;
        }
        return '';
      },
      types: ['text/plain'],
      items: []
    };
    try {
      Object.defineProperty(event, 'clipboardData', {
        value: fallbackClipboard,
        configurable: true
      });
    } catch (defineError) {
      event.clipboardData = fallbackClipboard;
    }
  }

  function attachDataTransfer(event, dataTransfer) {
    if (!event || !dataTransfer) return;
    try {
      Object.defineProperty(event, 'dataTransfer', {
        value: dataTransfer,
        configurable: true
      });
    } catch (error) {
      event.dataTransfer = dataTransfer;
    }
  }

  function createSyntheticClipboardEvent(text, dataTransfer) {
    let pasteEvent;
    try {
      pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true
      });
    } catch (error) {
      pasteEvent = document.createEvent('Event');
      pasteEvent.initEvent('paste', true, true);
    }

    if (dataTransfer) {
      attachClipboardData(pasteEvent, dataTransfer, text);
    } else {
      attachClipboardData(pasteEvent, null, text);
    }

    return pasteEvent;
  }

  function createInputEventWithTransfer(eventType, text, dataTransfer) {
    let event;
    if (typeof InputEvent === 'function') {
      event = new InputEvent(eventType, {
        bubbles: true,
        cancelable: true,
        inputType: 'insertFromPaste',
        data: text
      });
    } else {
      event = document.createEvent('Event');
      event.initEvent(eventType, true, true);
      event.data = text;
      event.inputType = 'insertFromPaste';
    }

    if (dataTransfer) {
      attachDataTransfer(event, dataTransfer);
    }

    return event;
  }

  function createDataTransferFromFiles(files = []) {
    if (typeof DataTransfer === 'undefined') {
      return {
        files,
        items: files.map((file) => ({
          kind: 'file',
          type: file?.type || 'image/png',
          getAsFile: () => file
        })),
        getData: () => '',
        setData: () => {}
      };
    }
    const dataTransfer = new DataTransfer();
    files.forEach((file) => {
      try {
        dataTransfer.items.add(file);
      } catch (error) {
        console.warn('[Chrome to X][Notion] DataTransfer#items.add に失敗:', error);
      }
    });
    return dataTransfer;
  }

  async function createFileFromImagePayload(image, index = 0) {
    if (!image || !image.base64) {
      throw new Error('Invalid image payload');
    }
    const response = await fetch(image.base64);
    const blob = await response.blob();
    const fileName = image.name || `image_${Date.now()}_${index}.png`;
    return new File([blob], fileName, { type: blob.type || 'image/png' });
  }

  function createDragEvent(eventType, dataTransfer, clientX, clientY) {
    let event;
    try {
      // DragEventを作成（clientX/clientYはコンストラクタで設定できないため、後で設定）
      event = new DragEvent(eventType, {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
    } catch (error) {
      // DragEventがサポートされていない場合のフォールバック
      event = document.createEvent('DragEvent');
      event.initDragEvent(eventType, true, true, window, 0, clientX, clientY, clientX, clientY, false, false, false, false, 0, null, dataTransfer);
    }
    
    // clientX/clientYを設定（読み取り専用プロパティなので、Object.definePropertyを使用）
    try {
      Object.defineProperty(event, 'clientX', {
        value: clientX,
        writable: false,
        configurable: true
      });
      Object.defineProperty(event, 'clientY', {
        value: clientY,
        writable: false,
        configurable: true
      });
    } catch (error) {
      console.warn('[Chrome to X][Notion] clientX/clientYの設定に失敗:', error);
    }
    
    // dataTransferを確実に設定
    if (dataTransfer && event.dataTransfer !== dataTransfer) {
      try {
        Object.defineProperty(event, 'dataTransfer', {
          value: dataTransfer,
          writable: false,
          configurable: true
        });
      } catch (error) {
        console.warn('[Chrome to X][Notion] dataTransferの設定に失敗:', error);
      }
    }
    
    return event;
  }

  async function insertImagesForNotion(element, images) {
    // Notionの実際の編集可能な要素（leaf）を取得
    const leafElement = findNotionLeaf(element) || element;
    
    console.log('[Chrome to X][Notion] 画像貼り付け先要素:', {
      original: element.tagName,
      leaf: leafElement ? leafElement.tagName : null,
      hasLeaf: !!leafElement
    });
    
    // 要素の中心座標を取得
    const rect = leafElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    leafElement.focus({ preventScroll: true });
    await delay(150); // フォーカスを確実にする

    let successCount = 0;

    for (let i = 0; i < images.length; i++) {
      try {
        console.log(`[Chrome to X][Notion] 画像${i + 1}枚目の処理開始（ドラッグ&ドロップ方式）`);
        const file = await createFileFromImagePayload(images[i], i);
        console.log(`[Chrome to X][Notion] 画像${i + 1}枚目のFile作成成功:`, file.name, file.type);
        
        const dataTransfer = createDataTransferFromFiles([file]);
        console.log(`[Chrome to X][Notion] DataTransfer作成成功:`, dataTransfer.files.length, 'files');

        // ドラッグ&ドロップイベントシーケンスを完全にシミュレート
        // 1. dragenter - ドラッグが要素に入った
        const dragenter = createDragEvent('dragenter', dataTransfer, centerX, centerY);
        const dragenterResult = leafElement.dispatchEvent(dragenter);
        console.log(`[Chrome to X][Notion] dragenter結果:`, dragenterResult);
        
        await delay(50);
        
        // 2. dragover - ドラッグが要素の上にある（preventDefault必須）
        const dragover = createDragEvent('dragover', dataTransfer, centerX, centerY);
        dragover.preventDefault(); // Notionが期待する動作
        const dragoverResult = leafElement.dispatchEvent(dragover);
        console.log(`[Chrome to X][Notion] dragover結果:`, dragoverResult);
        
        await delay(50);
        
        // 3. drop - ドロップ（preventDefault必須）
        const drop = createDragEvent('drop', dataTransfer, centerX, centerY);
        drop.preventDefault(); // デフォルト動作を防ぐ
        const dropResult = leafElement.dispatchEvent(drop);
        console.log(`[Chrome to X][Notion] drop結果:`, dropResult);
        
        await delay(100);
        
        // 4. dragleave - ドラッグが要素から離れた
        const dragleave = createDragEvent('dragleave', dataTransfer, centerX, centerY);
        leafElement.dispatchEvent(dragleave);
        
        // ドラッグ&ドロップが成功したか確認
        let imageInserted = dropResult;
        
        // フォールバック1: pasteイベントを試行
        if (!imageInserted) {
          console.log(`[Chrome to X][Notion] dropが失敗したため、pasteイベントを試行`);
          const pasteEvent = createSyntheticClipboardEvent('', dataTransfer);
          if (pasteEvent) {
            const pasteResult = leafElement.dispatchEvent(pasteEvent);
            console.log(`[Chrome to X][Notion] paste結果:`, pasteResult);
            imageInserted = pasteResult;
          }
        }
        
        // フォールバック: もう一度ドラッグ&ドロップを試行（座標を変えて）
        if (!imageInserted) {
          console.log(`[Chrome to X][Notion] 最初のドロップが失敗したため、再試行します`);
          
          // 座標を少し変えて再試行
          const retryX = centerX + (Math.random() * 20 - 10);
          const retryY = centerY + (Math.random() * 20 - 10);
          
          const retryDragenter = createDragEvent('dragenter', dataTransfer, retryX, retryY);
          leafElement.dispatchEvent(retryDragenter);
          await delay(50);
          
          const retryDragover = createDragEvent('dragover', dataTransfer, retryX, retryY);
          retryDragover.preventDefault();
          leafElement.dispatchEvent(retryDragover);
          await delay(50);
          
          const retryDrop = createDragEvent('drop', dataTransfer, retryX, retryY);
          retryDrop.preventDefault();
          const retryDropResult = leafElement.dispatchEvent(retryDrop);
          console.log(`[Chrome to X][Notion] 再試行drop結果:`, retryDropResult);
          
          if (retryDropResult) {
            imageInserted = true;
          }
        }
        
        // Notionが画像を処理する時間を確保
        await delay(800); // 画像アップロードに時間がかかる可能性があるため長めに
        
        if (imageInserted) {
          successCount++;
          console.log(`[Chrome to X][Notion] 画像${i + 1}枚目の処理完了`);
        } else {
          console.warn(`[Chrome to X][Notion] 画像${i + 1}枚目の処理が失敗しました`);
        }
      } catch (error) {
        console.error(`[Chrome to X][Notion] 画像${i + 1}枚目の処理エラー:`, error);
      }
    }

    if (successCount > 0) {
      console.log(`[Chrome to X][Notion] 画像${successCount}枚を貼り付けました（ドラッグ&ドロップ方式）`);
      return { success: true, count: successCount };
    }

    return { success: false, reason: 'Notion image sequence failed' };
  }

  const genericHandler = (typeof window !== 'undefined' && window.PlatformHandlers)
    ? window.PlatformHandlers.generic
    : null;

  function createDataTransferWithText(text) {
    if (typeof DataTransfer === 'undefined') {
      return {
        getData: (type) => {
          if (type === 'text/plain' || type === 'text') {
            return text;
          }
          return '';
        },
        setData: () => {},
        types: ['text/plain'],
        items: []
      };
    }
    const dataTransfer = new DataTransfer();
    try {
      dataTransfer.setData('text/plain', text);
      dataTransfer.setData('text/html', text);
    } catch (error) {
      console.warn('[Chrome to X][Notion] DataTransfer#setData に失敗:', error);
    }
    return dataTransfer;
  }

  async function insertTextForNotion(element, text) {
    element.focus({ preventScroll: true });
    await delay(80);

    // DataTransferオブジェクトにテキストを設定
    const dataTransfer = createDataTransferWithText(text);

    // Notionネイティブなペーストイベントをトリガー
    const pasteEvent = createSyntheticClipboardEvent(text, dataTransfer);
    
    // beforeinputイベント
    const beforeInput = createInputEventWithTransfer('beforeinput', text, dataTransfer);
    if (beforeInput) {
      element.dispatchEvent(beforeInput);
    }

    // pasteイベント
    if (pasteEvent) {
      element.dispatchEvent(pasteEvent);
    }

    // inputイベント
    const inputEvent = createInputEventWithTransfer('input', text, dataTransfer);
    if (inputEvent) {
      element.dispatchEvent(inputEvent);
    }

    // changeイベント
    element.dispatchEvent(new Event('change', { bubbles: true }));

    await delay(100);
    
    console.log('[Chrome to X][Notion] テキストを貼り付けました:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    return true;
  }

  async function insertText(element, text, options = {}) {
    const target = normalizeTargetElement(element);
    if (!target) {
      return false;
    }

    const isNotion = (() => {
      try {
        return NOTION_HOST_PATTERN.test(window.location.hostname.toLowerCase());
      } catch (error) {
        return false;
      }
    })();

    // Notionページの場合は専用関数を使用
    if (isNotion) {
      try {
        return await insertTextForNotion(target, text);
      } catch (error) {
        console.warn('[Chrome to X][Notion] Notion専用テキスト挿入に失敗、genericにフォールバック:', error);
      }
    }

    // Notionでない場合、またはNotion専用処理が失敗した場合はgenericにフォールバック
    if (genericHandler && typeof genericHandler.insertText === 'function') {
      return genericHandler.insertText(target, text, options);
    }
    
    return false;
  }

  async function insertImages(element, images) {
    if (!images || images.length === 0) {
      return { success: false, reason: 'No images provided' };
    }

    const target = normalizeTargetElement(element);
    if (!target) {
      console.warn('[Chrome to X][Notion] 貼り付け先が見つかりませんでした');
      return { success: false, reason: 'Editable element not found' };
    }

    const isNotion = (() => {
      try {
        return NOTION_HOST_PATTERN.test(window.location.hostname.toLowerCase());
      } catch (error) {
        return false;
      }
    })();

    // Notionでの画像貼り付けはドラッグ&ドロップのみサポート
    if (isNotion) {
      console.log('[Chrome to X][Notion] Notionでの画像貼り付け: ドラッグ&ドロップ方式で試行します（', images.length, '枚）');
      
      // ドラッグ&ドロップで画像を貼り付ける
      const notionResult = await insertImagesForNotion(target, images);
      if (notionResult.success) {
        return notionResult;
      }
      
      // ドラッグ&ドロップが失敗した場合、ユーザーにドラッグ&ドロップを案内
      console.warn('[Chrome to X][Notion] 自動貼り付けに失敗しました。サイドパネルから画像をドラッグ&ドロップしてください。');
      if (typeof showNotification === 'function') {
        showNotification('自動貼り付けに失敗しました。サイドパネルから画像をドラッグ&ドロップしてください。', 5000);
      }
      
      return { success: false, reason: 'Notion image paste requires drag and drop' };
    }

    // Notion以外の場合はgenericハンドラーを使用
    if (genericHandler && typeof genericHandler.insertImages === 'function') {
      return genericHandler.insertImages(target, images);
    }

    return { success: false, reason: 'No handler available' };
  }

  function supports(element) {
    return isEditableElement(element) || !!normalizeTargetElement(element);
  }

  if (typeof window.PlatformHandlers === 'undefined') {
    window.PlatformHandlers = {};
  }

  console.log('[Chrome to X] Notion: ハンドラー登録前:', Object.keys(window.PlatformHandlers));
  console.log('[Chrome to X] Notion: 実行コンテキスト - isTopFrame:', window === window.top, 'location:', window.location.href);

  window.PlatformHandlers.notion = {
    insertText,
    insertImages,
    supports
  };

  console.log('[Chrome to X] Notion専用ハンドラーを読み込みました');
  console.log('[Chrome to X] Notion: ハンドラー登録後:', Object.keys(window.PlatformHandlers));
  console.log('[Chrome to X] Notion: 登録されたハンドラー:', window.PlatformHandlers.notion);
})();
