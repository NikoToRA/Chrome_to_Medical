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
    return String(text);
  }

  // 改行を安全なHTMLブロックに変換（contenteditable向け）
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function textToHtmlBlocks(text) {
    // 空行も維持: "" -> <div><br></div>
    const lines = String(text).replace(/\r\n/g, '\n').split('\n');
    const blocks = lines.map(l => {
      if (l === '') return '<div><br></div>';
      return `<div>${escapeHtml(l)}</div>`;
    });
    return blocks.join('');
  }

  async function insertHtmlAtSelection(element, html) {
    try {
      element.focus({ preventScroll: true });
      await new Promise(r => setTimeout(r, 50));
      if (typeof document.execCommand === 'function') {
        // 選択を尊重してHTMLを挿入
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const ok = document.execCommand('insertHTML', false, html);
          if (ok) {
            element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste' }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
      }

      // フォールバック: Range + フラグメント
      const selection = window.getSelection();
      let range;
      if (selection && selection.rangeCount) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
      }

      const temp = document.createElement('div');
      temp.innerHTML = html;
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) fragment.appendChild(temp.firstChild);
      range.deleteContents();
      range.insertNode(fragment);

      // キャレットを末尾へ
      const newRange = document.createRange();
      newRange.selectNodeContents(element);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);

      element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste' }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      log('insertHtmlAtSelection error', e);
      return false;
    }
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

      const hasNewline = /[\r\n]/.test(text || '');
      const el = target || element;

      // contenteditableで改行を含むと以降が反映されない問題に対応
      if (hasNewline && el && (el.isContentEditable || el.getAttribute('contenteditable') === 'true')) {
        const html = textToHtmlBlocks(text);
        const ok = await insertHtmlAtSelection(el, html);
        if (ok) return true;
        // 失敗した場合は改行をスペースに潰してフォールバック
        const flattened = sanitizeForClinics(text).replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
        return await generic.insertText(el, flattened, options);
      }

      // textarea/input あるいは改行無しは汎用へ
      return await generic.insertText(el, text, options);
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
