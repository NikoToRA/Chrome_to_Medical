/**
 * プラットフォーム検出機能
 */
class PlatformDetector {
  /**
   * 現在のタブのURLからプラットフォームを検出
   * @param {string} url - URL
   * @returns {string|null} プラットフォーム名
   */
  static detectFromURL(url) {
    if (!url) return null;

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // EMR (電子カルテ) domains first (from EMR_DOMAINS mapping if available)
    try {
      const domains = (typeof window !== 'undefined' && window.EMR_DOMAINS) ? window.EMR_DOMAINS : null;
      if (domains) {
        for (const [key, list] of Object.entries(domains)) {
          if (!Array.isArray(list)) continue;
          if (list.some(d => d && hostname.includes(d.toLowerCase()))) {
            return key;
          }
        }
      }
    } catch (_) {}

    // Fallback to a few known patterns (in case EMR_DOMAINS not loaded)
    if (hostname.includes('clinics-karte.com') || hostname.includes('medley.jp')) return 'clinics';
    if (hostname.includes('digikar.co.jp') || hostname.includes('karte.m3.com')) return 'm3_digikar';
    if (hostname.includes('mobacal.net')) return 'mobacal';

    // X (旧Twitter)
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'x';
    }

    // Facebook
    if (hostname.includes('facebook.com')) {
      return 'facebook';
    }

    // Gmail
    if (hostname.includes('mail.google.com') || hostname.includes('gmail.com')) {
      return 'gmail';
    }

    // MicroCMS
    if (hostname.includes('microcms.io')) {
      return 'microcms';
    }

    // Instagram
    if (hostname.includes('instagram.com')) {
      return 'instagram';
    }

    // LinkedIn
    if (hostname.includes('linkedin.com')) {
      return 'linkedin';
    }

    // Note
    if (hostname.includes('note.com')) {
      return 'note';
    }

    // はてなブログ
    if (hostname.includes('hatenablog.com') || hostname.includes('hatenadiary.com')) {
      return 'hatena';
    }

    // Notion
    if (hostname.includes('notion.so') || hostname.includes('notion.site')) {
      return 'notion';
    }

    // Google Docs
    if (hostname.includes('docs.google.com')) {
      return 'google-docs';
    }

    return null;
  }

  /**
   * DOMからプラットフォームを検出
   * @param {Document} document - Documentオブジェクト
   * @returns {string|null} プラットフォーム名
   */
  static detectFromDOM(document) {
    // X (旧Twitter)
    if (document.querySelector('[data-testid="tweetTextarea_0"]') ||
        document.querySelector('[data-testid="tweet"]')) {
      return 'x';
    }

    // Facebook
    if (document.querySelector('[data-pagelet="Composer"]') ||
        document.querySelector('[role="textbox"][aria-label*="何を考えていますか"]')) {
      return 'facebook';
    }

    // Notion
    if (document.querySelector('[data-content-editable-root="true"]') ||
        document.querySelector('.notion-page-content') ||
        document.querySelector('[placeholder*="何か入力"]')) {
      return 'notion';
    }

    // Google Docs
    if (document.querySelector('.kix-appview-editor') ||
        document.querySelector('.docs-editor') ||
        document.querySelector('.kix-page')) {
      return 'google-docs';
    }

    return null;
  }

  /**
   * 現在のページからプラットフォームを検出
   * @returns {Promise<string|null>} プラットフォーム名
   */
  static async detectCurrentPlatform() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          resolve(null);
          return;
        }

        const tab = tabs[0];
        const platform = this.detectFromURL(tab.url);
        resolve(platform);
      });
    });
  }

  /**
   * プラットフォーム名を日本語に変換
   * @param {string} platform - プラットフォーム名
   * @returns {string} 日本語名
   */
  static getPlatformName(platform) {
    const names = {
      'clinics': 'CLINICS',
      'm3_digikar': 'm3 デジカル',
      'mobacal': 'モバカル',
      'medicom_hope': 'Medicom-HRf/HOPE (仮)',
      'brainbox': 'Brain Box (仮)',
      'maps': 'MAps (仮)',
      'x': 'X (旧Twitter)',
      'facebook': 'Facebook',
      'gmail': 'Gmail',
      'microcms': 'MicroCMS',
      'instagram': 'Instagram',
      'linkedin': 'LinkedIn',
      'note': 'Note',
      'hatena': 'はてなブログ',
      'notion': 'Notion',
      'google-docs': 'Google Docs'
    };
    return names[platform] || platform || '不明';
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.PlatformDetector = PlatformDetector;
}
