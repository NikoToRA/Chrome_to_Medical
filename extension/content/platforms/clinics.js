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
    try { console.log('[Chrome to Medical][clinics]', ...args); } catch (_) {}
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
      return !t || ['text','search','email','url','tel','password','number'].includes(t);
    }
    return !!(el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox');
  }

  function sanitizeForClinics(text) {
    if (!text) return '';
    // 改行をスペースに置換し、連続スペースを1つに整形
    return String(text)
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  async function insertText(element, text, options = {}) {
    try {
      log('insertText called');
      const target = resolveEditorElement(element);
      const generic = getGeneric();
      if (!generic || !generic.insertText) {
        log('generic handler not available');
        return false;
      }

      // ここで将来的に CLINICS 固有の前処理（例: タブ切替、特定フレームへのfocus）を追加

      // シンプル対処: 改行を含むと貼付け失敗するため、改行をスペースに変換
      const hasNewline = /[\r\n]/.test(text || '');
      const toInsert = hasNewline ? sanitizeForClinics(text) : text;

      // まずはそのまま（改行なし or 既に整形済み）を試し、失敗時は再整形して再試行
      let success = await generic.insertText(target || element, toInsert, options);
      if (!success && !hasNewline) {
        const fallback = sanitizeForClinics(text);
        if (fallback && fallback !== text) {
          success = await generic.insertText(target || element, fallback, options);
        }
      }
      return success;
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
