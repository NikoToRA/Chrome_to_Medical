/**
 * Offscreen Document for Clipboard API access
 * Background script (service worker) cannot access Clipboard API,
 * so we need this offscreen document to handle clipboard operations.
 */

console.log('[Offscreen] Offscreen document loaded');

// Background script からのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] メッセージ受信:', message);

  if (message.action === 'writeToClipboard') {
    handleClipboardWrite(message, sendResponse);
    return true; // 非同期レスポンス用
  }
});

/**
 * クリップボードに書き込む
 */
async function handleClipboardWrite(message, sendResponse) {
  try {
    if (message.text) {
      // テキストをクリップボードに書き込む
      // 方法1: navigator.clipboard.writeText を試す
      try {
        await navigator.clipboard.writeText(message.text);
        console.log('[Offscreen] テキストをクリップボードに書き込み成功（Clipboard API）');
        sendResponse({ success: true });
        return;
      } catch (clipboardError) {
        console.warn('[Offscreen] Clipboard API 失敗、execCommand にフォールバック:', clipboardError);
      }

      // 方法2: execCommand('copy') を使う（フォーカス不要）
      const textArea = document.createElement('textarea');
      textArea.value = message.text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        console.log('[Offscreen] テキストをクリップボードに書き込み成功（execCommand）');
        sendResponse({ success: true });
      } else {
        throw new Error('execCommand("copy") failed');
      }
    } else if (message.imageData) {
      // 画像をクリップボードに書き込む
      const response = await fetch(message.imageData);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);

      console.log('[Offscreen] 画像をクリップボードに書き込み成功');
      sendResponse({ success: true });
    } else {
      console.error('[Offscreen] データが指定されていません');
      sendResponse({ success: false, error: 'データが指定されていません' });
    }
  } catch (error) {
    console.error('[Offscreen] クリップボード書き込みエラー:', error);
    sendResponse({ success: false, error: error.message });
  }
}
