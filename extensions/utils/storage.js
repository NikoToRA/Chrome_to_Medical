/**
 * ローカルストレージ管理ユーティリティ
 */
class StorageManager {
  static STORAGE_KEYS = {
    TEXT: 'currentText',
    IMAGES: 'currentImages',
    HASHTAGS: 'hashtags',
    TEMPLATES: 'templates',
    TEMPLATE_CATEGORIES: 'templateCategories',
    TEMPLATES_DIRECT_PASTE: 'templatesDirectPaste',
    AI_AGENTS: 'aiAgents',
    AI_DELETED_AGENTS: 'aiDeletedAgents',  // v0.2.7: 削除済みエージェント一時保持
    AI_SELECTED_AGENT_ID: 'aiSelectedAgentId',
    AI_CHAT_SESSIONS: 'aiChatSessions',
    AI_SELECTED_MODEL: 'aiSelectedModel',
    TEXT_RETENTION: 'textRetentionAfterPaste',
    LAST_ACTIVE_TAB_BY_USER: 'lastActiveTabByUser',
    // v0.2.52: サブスクリプション1日1回チェック用
    SUBSCRIPTION_CACHE: 'subscriptionCache',           // サブスク状態キャッシュ
    LAST_SUBSCRIPTION_CHECK: 'lastSubscriptionCheck'   // 最終チェック日時
  };

  // 削除済みエージェントの保持期間（7日間）
  static DELETED_AGENT_RETENTION_DAYS = 7;
  // 削除済みエージェントの最大保持数
  static MAX_DELETED_AGENTS = 8;

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
   * 定型文カテゴリを保存
   * @param {Array<{id: string, name: string}>} categories
   */
  static async saveTemplateCategories(categories) {
    return this.set(this.STORAGE_KEYS.TEMPLATE_CATEGORIES, Array.isArray(categories) ? categories : []);
  }

  /**
   * 定型文カテゴリを取得
   * @returns {Promise<Array<{id: string, name: string}>>}
   */
  static async getTemplateCategories() {
    const defaults = [
      { id: 'diagnoses', name: '病名' },
      { id: 'medications', name: '薬剤' },
      { id: 'phrases', name: '定型文' }
    ];
    const categories = await this.get(this.STORAGE_KEYS.TEMPLATE_CATEGORIES, null);
    return Array.isArray(categories) && categories.length > 0 ? categories : defaults;
  }

  /**
   * 定型文テンプレートを保存
   * @param {Object.<string, string[]>} templates
   */
  static async saveTemplates(templates = {}) {
    // オブジェクトの各値が配列であることを確認
    const safe = {};
    Object.keys(templates).forEach(key => {
      safe[key] = Array.isArray(templates[key]) ? templates[key] : [];
    });
    return this.set(this.STORAGE_KEYS.TEMPLATES, safe);
  }

  /**
   * 定型文テンプレートを取得
   * @returns {Promise<Object.<string, string[]>>}
   */
  static async getTemplates() {
    const defaults = {
      diagnoses: ['急性上気道炎', 'インフルエンザ', '胃潰瘍', '高血圧症', '脂質異常症'],
      phrases: ['2週間後再診', '栄養指導を行なった', '休養を指示した', '副作用について説明した', '経過良好'],
      medications: []
    };
    const value = await this.get(this.STORAGE_KEYS.TEMPLATES, defaults);
    // 既存データが空配列の場合でもデフォルトを使いたい場合はマージが必要だが、
    // ここでは初期値として設定するだけにする（既存ユーザーのデータを勝手に変えないため）
    // ただし、初回起動時などはこれが返るはず
    if (!value) return defaults;

    // 値がある場合でも、各キーが存在するか確認
    if (!value.diagnoses) value.diagnoses = [];
    if (!value.phrases) value.phrases = [];
    if (!value.medications) value.medications = [];

    return value;
  }

  /**
   * 定型文の直接貼り付け設定を保存
   * @param {boolean} enabled
   */
  static async saveTemplatesDirectPaste(enabled) {
    return this.set(this.STORAGE_KEYS.TEMPLATES_DIRECT_PASTE, Boolean(enabled));
  }

  /**
   * 定型文の直接貼り付け設定を取得
   * @returns {Promise<boolean>}
   */
  static async getTemplatesDirectPaste() {
    return this.get(this.STORAGE_KEYS.TEMPLATES_DIRECT_PASTE, true);
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

  // ========== 削除済みエージェント管理 (v0.2.7) ==========

  /**
   * 削除済みエージェント一覧を取得
   * @returns {Promise<Array>}
   */
  static async getDeletedAgents() {
    const deleted = await this.get(this.STORAGE_KEYS.AI_DELETED_AGENTS, []);
    return Array.isArray(deleted) ? deleted : [];
  }

  /**
   * 削除済みエージェントを保存
   * @param {Array} deletedAgents
   */
  static async saveDeletedAgents(deletedAgents = []) {
    return this.set(this.STORAGE_KEYS.AI_DELETED_AGENTS, Array.isArray(deletedAgents) ? deletedAgents : []);
  }

  /**
   * エージェントを削除済みリストに追加
   * @param {Object} agent - 削除するエージェント
   * @returns {Promise<void>}
   */
  static async addToDeletedAgents(agent) {
    if (!agent || !agent.id) return;

    const deleted = await this.getDeletedAgents();

    // 既に削除済みリストにある場合は更新
    const existingIndex = deleted.findIndex(d => d.id === agent.id);
    const deletedEntry = {
      ...agent,
      deletedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.DELETED_AGENT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    };

    if (existingIndex !== -1) {
      deleted[existingIndex] = deletedEntry;
    } else {
      deleted.push(deletedEntry);
    }

    // 最大数を超えた場合、古いものから削除
    const sorted = deleted.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    const trimmed = sorted.slice(0, this.MAX_DELETED_AGENTS);

    await this.saveDeletedAgents(trimmed);
  }

  /**
   * 削除済みリストからエージェントを削除（復元時 or 完全削除時）
   * @param {string} agentId
   * @returns {Promise<Object|null>} 削除されたエージェント（復元用）
   */
  static async removeFromDeletedAgents(agentId) {
    const deleted = await this.getDeletedAgents();
    const agent = deleted.find(d => d.id === agentId);
    const filtered = deleted.filter(d => d.id !== agentId);
    await this.saveDeletedAgents(filtered);
    return agent || null;
  }

  /**
   * 期限切れの削除済みエージェントをクリーンアップ
   * @returns {Promise<Array>} 削除されたエージェントID一覧（リモート同期用）
   */
  static async cleanupExpiredDeletedAgents() {
    const deleted = await this.getDeletedAgents();
    const now = new Date();
    const expired = [];
    const active = [];

    deleted.forEach(agent => {
      if (new Date(agent.expiresAt) <= now) {
        expired.push(agent.id);
      } else {
        active.push(agent);
      }
    });

    if (expired.length > 0) {
      await this.saveDeletedAgents(active);
      console.log(`[StorageManager] ${expired.length}件の期限切れ削除済みエージェントをクリーンアップしました`);
    }

    return expired;
  }

  /**
   * 有効な（期限内の）削除済みエージェント一覧を取得
   * @returns {Promise<Array>}
   */
  static async getActiveDeletedAgents() {
    const deleted = await this.getDeletedAgents();
    const now = new Date();
    return deleted.filter(agent => new Date(agent.expiresAt) > now);
  }

  // ========== 削除済みエージェント管理ここまで ==========

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

  /**
   * 貼り付け後のテキスト保持設定を保存
   * @param {boolean} retainText
   */
  static async saveTextRetentionSetting(retainText) {
    return this.set(this.STORAGE_KEYS.TEXT_RETENTION, Boolean(retainText));
  }

  /**
   * 貼り付け後のテキスト保持設定を取得
   * @returns {Promise<boolean>}
   */
  static async getTextRetentionSetting() {
    return this.get(this.STORAGE_KEYS.TEXT_RETENTION, false);
  }

  /**
   * 最後に開いていたタブ（ユーザーごと）を取得
   * @param {string} userId - email等（未ログインは 'anonymous' など）
   * @param {string} defaultTabId
   * @returns {Promise<string>}
   */
  static async getLastActiveTabForUser(userId = 'anonymous', defaultTabId = 'aiTab') {
    const map = await this.get(this.STORAGE_KEYS.LAST_ACTIVE_TAB_BY_USER, {});
    const safeMap = map && typeof map === 'object' ? map : {};
    const tabId = safeMap[userId];
    return typeof tabId === 'string' && tabId ? tabId : defaultTabId;
  }

  /**
   * 最後に開いていたタブ（ユーザーごと）を保存
   * @param {string} userId - email等（未ログインは 'anonymous' など）
   * @param {string} tabId
   * @returns {Promise<void>}
   */
  static async saveLastActiveTabForUser(userId = 'anonymous', tabId = '') {
    if (!tabId) return;
    const map = await this.get(this.STORAGE_KEYS.LAST_ACTIVE_TAB_BY_USER, {});
    const safeMap = map && typeof map === 'object' ? map : {};
    safeMap[userId] = tabId;
    return this.set(this.STORAGE_KEYS.LAST_ACTIVE_TAB_BY_USER, safeMap);
  }

  /**
   * 同期用に設定をエクスポート
   * @returns {Promise<Object>}
   */
  static async exportSettingsForSync() {
    const aiAgents = await this.getAgents();
    const templates = await this.getTemplates();
    const templateCategories = await this.getTemplateCategories();

    // デフォルトのエージェントを除外して、ユーザー作成のものだけにするか？
    // シンプルにするため、現在はすべて保存する（重複排除はインポート側でやる）
    return {
      aiAgents,
      templates,
      templateCategories,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * 同期された設定をインポート（マージ）
   * @param {Object} remoteSettings
   */
  static async importSyncedSettings(remoteSettings) {
    if (!remoteSettings) return;

    // 1. エージェントのマージ (IDベース)
    const localAgents = await this.getAgents();
    const remoteAgents = remoteSettings.aiAgents || [];
    const agentMap = new Map();

    // v0.2.7: 削除済みリストのIDを取得（これらはPull時に復活させない）
    const deletedAgents = await this.getDeletedAgents();
    const deletedAgentIds = new Set(deletedAgents.map(a => a.id));

    // ローカルを先にマップに入れる
    localAgents.forEach(a => agentMap.set(a.id, a));
    // リモートで上書き（リモートが正）ただし削除済みリストにあるものはスキップ
    remoteAgents.forEach(a => {
      if (!deletedAgentIds.has(a.id)) {
        agentMap.set(a.id, a);
      } else {
        console.log(`[StorageManager] 削除済みエージェント "${a.name || a.id}" はPull時にスキップしました`);
      }
    });

    await this.saveAgents(Array.from(agentMap.values()));

    // 2. テンプレートカテゴリのマージ (IDベース)
    const localCategories = await this.getTemplateCategories();
    const remoteCategories = remoteSettings.templateCategories || [];
    const catMap = new Map();

    localCategories.forEach(c => catMap.set(c.id, c));
    remoteCategories.forEach(c => catMap.set(c.id, c));

    await this.saveTemplateCategories(Array.from(catMap.values()));

    // 3. テンプレートの中身のマージ
    const localTemplates = await this.getTemplates();
    const remoteTemplates = remoteSettings.templates || {};
    const mergedTemplates = { ...localTemplates };

    // カテゴリごとにリストをマージする（単純な上書きではなく、ユニークにする）
    Object.keys(remoteTemplates).forEach(key => {
      const localList = mergedTemplates[key] || [];
      const remoteList = remoteTemplates[key] || [];
      // Setを使って重複排除
      const mergedList = [...new Set([...localList, ...remoteList])];
      mergedTemplates[key] = mergedList;
    });

    await this.saveTemplates(mergedTemplates);
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
