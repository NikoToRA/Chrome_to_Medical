/**
 * CLINICS（電子カルテ）向けの貼り付けハンドラー（初期実装）
 *
 * 目的:
 * - 今後の個別最適化のための足場を用意
 * - 現時点では generic ハンドラーに委譲しつつ、将来ここで専用処理を追加
 */

(function () {
  'use strict';

  if (typeof window.PlatformHandlers === 'undefined') {
    window.PlatformHandlers = {};
  }

  function log(...args) {
    try { console.log('[Chrome to Medical][clinics]', ...args); } catch (_) { }
  }

  function getGeneric() {
    return window.PlatformHandlers && (window.PlatformHandlers.generic || window.PlatformHandlers.default);
  }

  // 代表的な編集要素を探す（簡易版）
  function resolveEditorElement(passedElement) {
    if (passedElement && isEditable(passedElement)) return passedElement;

    const selectors = [
      'textarea:focus',
      'textarea',
      'input[type="text"]:focus',
      'input[type="text"]',
      '[role="textbox"]:focus',
      '[role="textbox"]',
      '[contenteditable="true"]:focus',
      '[contenteditable="true"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (isEditable(el)) return el;
    }
    return null;
  }

  function isEditable(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      const t = (el.type || '').toLowerCase();
      return !t || ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(t);
    }
    return !!(el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox');
  }

  function sanitizeForClinics(text) {
    if (!text) return '';
    return String(text);
  }

  async function insertText(element, text, options = {}) {
    try {
      log('insertText called');
      const target = resolveEditorElement(element);

      // HTMLエスケープ処理
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      // 改行を<br>タグに変換
      const htmlText = escapedText.replace(/\r?\n/g, '<br>');

      // フォーカスを確実にする
      if (target) {
        target.focus();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // insertHTMLコマンドを実行
      // 多くのWebカルテやリッチテキストエディタはこれで改行付きテキストを受け入れる
      if (document.queryCommandSupported('insertHTML')) {
        const success = document.execCommand('insertHTML', false, htmlText);
        if (success) {
          log('insertHTML success');
          // イベント発火で変更を通知
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }

      // insertHTMLが失敗、またはサポートされていない場合はgenericハンドラーにフォールバック
      // ただし、genericハンドラーは改行で問題が起きる可能性があるため、
      // 最終手段として全角スペース置換を試みる
      const generic = getGeneric();
      if (generic && generic.insertText) {
        log('fallback to generic handler');
        // まずはそのまま試す
        let success = await generic.insertText(target || element, text, options);
        if (!success) {
          // 失敗したら全角スペース置換で再試行
          const fallbackText = text.replace(/[\r\n]+/g, '\u3000');
          success = await generic.insertText(target || element, fallbackText, options);
        }
        return success;
      }

      return false;
    } catch (e) {
      log('insertText error', e);
      return false;
    }
  }

  async function insertImages(element, images) {
    try {
      const target = resolveEditorElement(element);
      const generic = getGeneric();
      if (!generic || !generic.insertImages) return { success: false, reason: 'no generic' };
      return await generic.insertImages(target || element, images);
    } catch (e) {
      return { success: false, reason: e?.message || 'error' };
    }
  }

  function supports(el) {
    // platformがclinicsのときに優先選択されるため常にtrueでOK
    return true;
  }

  window.PlatformHandlers.clinics = {
    insertText,
    insertImages,
    supports
  };

  log('handler registered');
})();
