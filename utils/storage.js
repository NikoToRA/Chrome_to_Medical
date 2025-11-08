/**
 * ローカルストレージ管理ユーティリティ
 */
class StorageManager {
  /**
   * データを保存
   * @param {string} key - キー
   * @param {*} value - 値
   */
  static async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  /**
   * データを取得
   * @param {string} key - キー
   * @param {*} defaultValue - デフォルト値
   * @returns {Promise<*>}
   */
  static async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] !== undefined ? result[key] : defaultValue);
      });
    });
  }

  /**
   * 複数のデータを一度に取得
   * @param {string[]} keys - キーの配列
   * @returns {Promise<Object>}
   */
  static async getMultiple(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    });
  }

  /**
   * データを削除
   * @param {string} key - キー
   */
  static async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  }

  /**
   * すべてのデータをクリア
   */
  static async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }

  /**
   * テキストを保存
   * @param {string} text - テキスト
   */
  static async saveText(text) {
    return this.set('currentText', text);
  }

  /**
   * テキストを取得
   * @returns {Promise<string>}
   */
  static async getText() {
    return this.get('currentText', '');
  }

  /**
   * 画像を保存
   * @param {Array} images - 画像データの配列
   */
  static async saveImages(images) {
    return this.set('currentImages', images);
  }

  /**
   * 画像を取得
   * @returns {Promise<Array>}
   */
  static async getImages() {
    return this.get('currentImages', []);
  }

  /**
   * ハッシュタグを保存
   * @param {Array} hashtags - ハッシュタグの配列
   */
  static async saveHashtags(hashtags) {
    return this.set('hashtags', hashtags);
  }

  /**
   * ハッシュタグを取得
   * @returns {Promise<Array>}
   */
  static async getHashtags() {
    return this.get('hashtags', []);
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
