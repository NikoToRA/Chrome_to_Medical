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
      'x': 'X (旧Twitter)',
      'facebook': 'Facebook',
      'gmail': 'Gmail',
      'microcms': 'MicroCMS',
      'instagram': 'Instagram',
      'linkedin': 'LinkedIn',
      'note': 'Note',
      'hatena': 'はてなブログ'
    };
    return names[platform] || platform || '不明';
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.PlatformDetector = PlatformDetector;
}

