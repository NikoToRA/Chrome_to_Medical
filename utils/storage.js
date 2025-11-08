/**
 * ローカルストレージ管理ユーティリティ
 */
class StorageManager {
  static STORAGE_KEYS = {
    TEXT: 'currentText',
    IMAGES: 'currentImages',
    HASHTAGS: 'hashtags',
    CLAUDE_API_KEY: 'claudeApiKey',
    AI_AGENTS: 'aiAgents',
    AI_SELECTED_AGENT_ID: 'aiSelectedAgentId',
    AI_CHAT_SESSIONS: 'aiChatSessions',
    AI_SELECTED_MODEL: 'aiSelectedModel'
  };

  static STORAGE_SOFT_LIMIT_BYTES = 4 * 1024 * 1024; // 4MB

  static textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

  /**
   * オブジェクトサイズの推定値（バイト）を取得
   * @param {*} value
   * @returns {number}
   */
  static estimateSize(value) {
    try {
      if (!this.textEncoder) {
        return JSON.stringify(value).length;
      }
      return this.textEncoder.encode(JSON.stringify(value ?? null)).length;
    } catch (error) {
      console.warn('[StorageManager] サイズ推定に失敗しました', error);
      return 0;
    }
  }

  /**
   * ストレージ全体の推定サイズを取得
   * @returns {Promise<number>}
   */
  static async getTotalUsage() {
    const allData = await this.getAll();
    return this.estimateSize(allData);
  }

  /**
   * ストレージ全体のデータを取得
   * @returns {Promise<Object>}
   */
  static async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => resolve(result || {}));
    });
  }

  /**
   * ストレージ使用量が上限を超えないように履歴を整理
   * @param {Array} sessions
   * @param {Object} overrides
   * @returns {Promise<Array>}
   */
  static async pruneChatSessionsIfNeeded(sessions = [], overrides = {}) {
    let prunedSessions = Array.isArray(sessions) ? [...sessions] : [];
    let totalBytes = await this.estimateTotalUsage({
      ...overrides,
      [this.STORAGE_KEYS.AI_CHAT_SESSIONS]: prunedSessions
    });

    if (totalBytes <= this.STORAGE_SOFT_LIMIT_BYTES) {
      return prunedSessions;
    }

    // 古いセッションから削除
    prunedSessions.sort((a, b) => {
      const dateA = new Date(a?.createdAt || 0).getTime();
      const dateB = new Date(b?.createdAt || 0).getTime();
      return dateA - dateB;
    });

    while (prunedSessions.length > 0 && totalBytes > this.STORAGE_SOFT_LIMIT_BYTES) {
      prunedSessions.shift();
      totalBytes = await this.estimateTotalUsage({
        ...overrides,
        [this.STORAGE_KEYS.AI_CHAT_SESSIONS]: prunedSessions
      });
    }

    if (totalBytes > this.STORAGE_SOFT_LIMIT_BYTES) {
      console.warn('[StorageManager] チャット履歴を整理しましたが、まだ容量が上限付近です');
    }

    return prunedSessions;
  }

  /**
   * 推定総容量を計算
   * @param {Object} overrides
   * @returns {Promise<number>}
   */
  static async estimateTotalUsage(overrides = {}) {
    const allData = await this.getAll();
    const merged = { ...allData, ...overrides };
    return this.estimateSize(merged);
  }

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
    return this.set(this.STORAGE_KEYS.TEXT, text);
  }

  /**
   * テキストを取得
   * @returns {Promise<string>}
   */
  static async getText() {
    return this.get(this.STORAGE_KEYS.TEXT, '');
  }

  /**
   * 画像を保存
   * @param {Array} images - 画像データの配列
   */
  static async saveImages(images) {
    return this.set(this.STORAGE_KEYS.IMAGES, images);
  }

  /**
   * 画像を取得
   * @returns {Promise<Array>}
   */
  static async getImages() {
    return this.get(this.STORAGE_KEYS.IMAGES, []);
  }

  /**
   * ハッシュタグを保存
   * @param {Array} hashtags - ハッシュタグの配列
   */
  static async saveHashtags(hashtags) {
    return this.set(this.STORAGE_KEYS.HASHTAGS, hashtags);
  }

  /**
   * ハッシュタグを取得
   * @returns {Promise<Array>}
   */
  static async getHashtags() {
    return this.get(this.STORAGE_KEYS.HASHTAGS, []);
  }

  /**
   * Claude APIキーを保存
   * @param {string} apiKey
   */
  static async saveApiKey(apiKey) {
    return this.set(this.STORAGE_KEYS.CLAUDE_API_KEY, apiKey || '');
  }

  /**
   * Claude APIキーを取得
   * @returns {Promise<string>}
   */
  static async getApiKey() {
    return this.get(this.STORAGE_KEYS.CLAUDE_API_KEY, '');
  }

  /**
   * AIエージェントを保存
   * @param {Array} agents
   */
  static async saveAgents(agents = []) {
    return this.set(this.STORAGE_KEYS.AI_AGENTS, Array.isArray(agents) ? agents : []);
  }

  /**
   * AIエージェント一覧を取得
   * @param {Array} defaultAgents
   * @returns {Promise<Array>}
   */
  static async getAgents(defaultAgents = []) {
    const agents = await this.get(this.STORAGE_KEYS.AI_AGENTS, null);
    if (Array.isArray(agents) && agents.length > 0) {
      return agents;
    }
    return Array.isArray(defaultAgents) ? defaultAgents : [];
  }

  /**
   * 選択中のAIエージェントIDを保存
   * @param {string|null} agentId
   */
  static async saveSelectedAgentId(agentId) {
    return this.set(this.STORAGE_KEYS.AI_SELECTED_AGENT_ID, agentId || '');
  }

  /**
   * 選択中のAIエージェントIDを取得
   * @returns {Promise<string>}
   */
  static async getSelectedAgentId() {
    return this.get(this.STORAGE_KEYS.AI_SELECTED_AGENT_ID, '');
  }

  /**
   * チャットセッションを保存（容量管理付き）
   * @param {Array} sessions
   * @returns {Promise<void>}
   */
  static async saveChatSessions(sessions = []) {
    const normalized = Array.isArray(sessions) ? sessions : [];
    const pruned = await this.pruneChatSessionsIfNeeded(normalized);
    return this.set(this.STORAGE_KEYS.AI_CHAT_SESSIONS, pruned);
  }

  /**
   * チャットセッションを取得
   * @returns {Promise<Array>}
   */
  static async getChatSessions() {
    const sessions = await this.get(this.STORAGE_KEYS.AI_CHAT_SESSIONS, []);
    return Array.isArray(sessions) ? sessions : [];
  }

  /**
   * 選択中のAIモデルを保存
   * @param {string} modelId
   */
  static async saveSelectedModel(modelId) {
    return this.set(this.STORAGE_KEYS.AI_SELECTED_MODEL, modelId || '');
  }

  /**
   * 選択中のAIモデルを取得
   * @param {string} defaultModel
   * @returns {Promise<string>}
   */
  static async getSelectedModel(defaultModel = '') {
    return this.get(this.STORAGE_KEYS.AI_SELECTED_MODEL, defaultModel);
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
