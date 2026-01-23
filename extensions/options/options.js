const addAgentBtn = document.getElementById('addAgentBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const agentsList = document.getElementById('agentsList');
const toastContainer = document.getElementById('toastContainer');

const state = {
  defaultAgents: (window.AiAgentUtils && window.AiAgentUtils.getDefaultAgents()) || [],
  agents: [],
  isSavingAgents: false
};

document.addEventListener('DOMContentLoaded', initOptions);

async function initOptions() {
  bindEvents();
  await loadAgents();
  setupStorageWatchers();
  checkSubscriptionStatus(); // 非同期で実行

  // v0.2.7: 削除済みエージェントUIの初期化
  setupDeletedAgentsEvents();
  renderDeletedAgents();
  // 期限切れの削除済みエージェントをクリーンアップ
  StorageManager.cleanupExpiredDeletedAgents();

  // [Auto-Sync] Pull on load (Silent) - ローカルにデータがある場合はスキップ
  const localAgents = await StorageManager.getAgents();
  const localCategories = await StorageManager.getTemplateCategories();
  if ((!localAgents || localAgents.length === 0) && (!localCategories || localCategories.length === 0)) {
    console.log('[Options] ローカルデータなし、自動Pull実行');
    handleSyncSettings({ pullOnly: true, silent: true });
  } else {
    console.log('[Options] ローカルにデータあり、自動Pullスキップ');
  }

  // v0.2.5: メールアドレス表示
  updateCurrentUserEmailDisplay();
}

// v0.2.5: 現在のユーザーメールアドレスを表示
function updateCurrentUserEmailDisplay() {
  const emailDisplay = document.getElementById('currentUserEmailDisplay');
  if (emailDisplay && window.AuthManager) {
    const user = window.AuthManager.getUser();
    emailDisplay.textContent = user?.email ? `📧 ${user.email}` : '📧 未ログイン';
  }
}

async function checkSubscriptionStatus() {
  const btn = document.getElementById('cancelSubscriptionBtn');
  if (!btn || !window.AuthManager) return;

  // Visual feedback that check is starting
  const originalText = btn.textContent;
  btn.textContent = '契約状況を確認中...';
  btn.disabled = true;

  try {
    // 最新のステータスを取得
    await window.AuthManager.init();
    const user = window.AuthManager.getUser();

    if (!user || !user.email) {
      console.warn('[Options] User not logged in during check');
      btn.textContent = '未ログイン (クリックでログイン)';
      btn.classList.remove('btn-danger', 'btn-secondary');
      btn.classList.add('btn-primary'); // Make it look inviting
      btn.disabled = false;

      btn.onclick = (evt) => {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        window.open('https://stkarteai1763705952.z11.web.core.windows.net/login', '_blank');
      };
      return;
    }

    // User exists, check API
    const response = await window.ApiClient.checkSubscription(user.email);
    console.log('[Options] Subscription Check Response:', response);

    if (response) {
      if (response.cancelAtPeriodEnd) {
        btn.textContent = '解約予約済み (期間終了まで利用可)';
        btn.disabled = true;
        btn.classList.add('btn-disabled');
        btn.style.backgroundColor = '#ccc';
        btn.style.borderColor = '#ccc';
        btn.style.color = '#666';

        // 期間終了日を表示する要素を追加
        if (response.expiry) {
          const expiry = new Date(response.expiry).toLocaleDateString();
          // Avoid duplicate info elements
          const existingInfo = btn.parentNode.nextElementSibling;
          if (!existingInfo || !existingInfo.classList.contains('sub-info')) {
            const info = document.createElement('p');
            info.className = 'sub-info';
            info.style.fontSize = '0.8rem';
            info.style.color = '#d32f2f';
            info.style.marginTop = '8px';
            info.textContent = `※ ${expiry} までご利用いただけます。その後自動的に利用停止となります。`;
            btn.parentNode.after(info);
          }
        }
      } else {
        // Active and NOT canceled
        console.log('[Options] User is active and NOT canceled.');
        btn.textContent = 'プランを解約する'; // Restore default
        btn.disabled = false;
      }
    } else {
      // No response or null
      btn.textContent = 'ステータス不明';
      btn.disabled = false;
    }

  } catch (e) {
    console.warn('[Options] サブスクリプション状態確認エラー:', e);

    // Show error state with Retry option
    btn.textContent = `エラー: ${e.message.slice(0, 20)} (クリックで再試行)`;
    btn.title = e.message;
    btn.classList.add('btn-warning');
    btn.disabled = false;

    // Remove existing event listeners to prevent stacking (tricky with anonymous functions)
    // Instead, we just set a flag or rely on the fact that click handler is handleCancelSubscription.
    // We should probably change the click handler behavior if in error state, 
    // BUT handleCancelSubscription also does a form of auth check/fallback.

    // Ideally: Click -> Retry Check
    // Reuse the button but change behavior temporarily? 
    // Easier: Just let handleCancelSubscription run, it has fallbacks. 
    // OR: Explicitly add a "Retry" listener.

    btn.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      btn.onclick = null; // Reset
      await checkSubscriptionStatus(); // Retry check
    };
  }
}

async function loadAgents() {
  try {
    const defaults = await loadPackagedAgentDefaults();
    const storedAgents = await StorageManager.getAgents(defaults);
    state.agents = normalizeAgents(storedAgents, defaults);
    renderAgents();
  } catch (error) {
    console.error('[Options] エージェントの読み込みに失敗しました', error);
    showToast('エージェントの読み込みに失敗しました', 'warning');
  }
}

async function loadPackagedAgentDefaults() {
  try {
    const url = chrome.runtime.getURL('defaults/ai-agents.json');
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((a, i) => ({
          id: a.id || (window.AiAgentUtils ? AiAgentUtils.generateAgentId(`agent${i}`) : `agent-${i}`),
          label: a.label || a.name || `Agent ${i + 1}`,
          name: a.name || a.label || `Agent ${i + 1}`,
          description: a.description || '',
          instructions: a.instructions || '',
          createdAt: a.createdAt || new Date().toISOString(),
          updatedAt: a.updatedAt || new Date().toISOString()
        }));
      }
    }
  } catch (e) {
    // ignore and fallback
  }
  return getDefaultAgents();
}

function bindEvents() {
  if (addAgentBtn) {
    addAgentBtn.addEventListener('click', handleAddAgent);
  }

  const reLoginBtn = document.getElementById('reLoginBtn');
  if (reLoginBtn) {
    reLoginBtn.addEventListener('click', () => {
      // Landing Page でのログインを促す
      // 既存のログインページへ飛ばす
      window.open('https://stkarteai1763705952.z11.web.core.windows.net/login', '_blank');
    });
  }

  const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
  if (cancelSubscriptionBtn) {
    cancelSubscriptionBtn.addEventListener('click', handleCancelSubscription);
  }



  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      window.close();
    });
  }

  if (agentsList) {
    agentsList.addEventListener('click', handleAgentAction);
  }

  // v0.2.5: ログアウトボタン（Pushは編集時に自動で行われるため、ログアウト時は不要）
  const headerLogoutBtn = document.getElementById('headerLogoutBtn');
  if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener('click', async () => {
      if (confirm('ログアウトしますか？\n\n設定はクラウドに保存されているため、再ログイン時に復元されます。')) {
        if (window.AuthManager) {
          await window.AuthManager.logout();
          window.close(); // オプションページを閉じる
        }
      }
    });
  }

  // v0.2.5: Push/Pullを分離したボタン
  const pushSettingsBtn = document.getElementById('pushSettingsBtn');
  if (pushSettingsBtn) {
    pushSettingsBtn.addEventListener('click', () => handleSyncSettings({ pushOnly: true, btn: pushSettingsBtn }));
  }
  const pullSettingsBtn = document.getElementById('pullSettingsBtn');
  if (pullSettingsBtn) {
    pullSettingsBtn.addEventListener('click', () => {
      if (confirm('クラウドから設定を取得すると、現在のローカル設定が上書きされます。続行しますか？')) {
        handleSyncSettings({ pullOnly: true, btn: pullSettingsBtn });
      }
    });
  }
}

function setupStorageWatchers() {
  if (!chrome?.storage?.onChanged) return;

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[StorageManager.STORAGE_KEYS.AI_AGENTS]) {
      const defaults = getDefaultAgents();
      const newAgents = changes[StorageManager.STORAGE_KEYS.AI_AGENTS].newValue;
      state.agents = normalizeAgents(newAgents, defaults);
      renderAgents();
      if (!state.isSavingAgents) {
        showToast('エージェント設定を同期しました', 'info');
      }
    }
  });
}

function handleAddAgent() {
  if (state.agents.length >= 8) {
    showToast('エージェントは最大8個までです', 'warning');
    alert('エージェントの作成上限（8個）に達しました。\n既存のエージェントを削除してから作成してください。');
    return;
  }
  const newAgent = createBlankAgent();
  state.agents = [...state.agents, newAgent];
  renderAgents();
  showToast('新しいエージェントを追加しました', 'info');
}

async function handleModelChange(event) {
  const newModel = event.target.value;
  if (!SUPPORTED_MODELS.includes(newModel)) {
    showToast('選択したモデルは利用できません', 'warning');
    modelSelector.value = state.selectedModel;
    return;
  }
  state.selectedModel = newModel;
  try {
    state.isSavingModel = true;
    await StorageManager.saveSelectedModel(newModel);
    showToast('モデル設定を保存しました', 'info');
  } catch (error) {
    console.error('[Options] モデル設定の保存に失敗しました', error);
    showToast('モデル設定の保存に失敗しました', 'warning');
  } finally {
    state.isSavingModel = false;
  }
}

async function handleAgentAction(event) {
  const action = event.target.getAttribute('data-action');
  if (!action) return;

  const card = event.target.closest('.agent-card');
  if (!card) return;

  const agentId = card.getAttribute('data-agent-id');
  if (!agentId) return;

  switch (action) {
    case 'save':
      await handleSaveAgent(card, agentId);
      break;
    case 'delete':
      await handleDeleteAgent(agentId);
      break;
    case 'duplicate':
      await handleDuplicateAgent(agentId);
      break;
    case 'reset':
      await handleResetAgent(agentId);
      break;
    default:
      break;
  }
}

async function handleSaveAgent(card, agentId) {
  if (state.isSavingAgents) return;
  const updatedAgent = extractAgentFromCard(card, agentId);

  if (!updatedAgent.name) {
    showToast('エージェント名を入力してください', 'warning');
    return;
  }

  const existingIndex = state.agents.findIndex((agent) => agent.id === agentId);
  if (existingIndex === -1) {
    showToast('対象のエージェントが見つかりませんでした', 'warning');
    return;
  }

  const nextAgents = [...state.agents];
  nextAgents[existingIndex] = {
    ...nextAgents[existingIndex],
    ...updatedAgent,
    updatedAt: new Date().toISOString()
  };

  await persistAgents(nextAgents, 'エージェントを保存しました');
}

async function handleDeleteAgent(agentId) {
  if (state.isSavingAgents) return;
  if (!confirm('このエージェントを削除しますか？\n\n※ 7日間はローカルに保持され、復元可能です。')) {
    return;
  }

  // 削除するエージェントを取得
  const agentToDelete = state.agents.find((agent) => agent.id === agentId);
  if (agentToDelete) {
    // 削除済みリストに追加（7日間保持）
    await StorageManager.addToDeletedAgents(agentToDelete);
  }

  const nextAgents = state.agents.filter((agent) => agent.id !== agentId);
  // 削除時は自動Pushをスキップ（後で復元可能にするため）
  await persistAgents(nextAgents, 'エージェントを削除しました（7日間復元可能）', { skipAutoSync: true });

  // 削除済みエージェントUIを更新
  renderDeletedAgents();
}

async function handleDuplicateAgent(agentId) {
  if (state.isSavingAgents) return;

  const target = state.agents.find((agent) => agent.id === agentId);
  if (!target) {
    showToast('複製元のエージェントが見つかりませんでした', 'warning');
    return;
  }

  const duplicated = {
    ...target,
    id: AiAgentUtils.generateAgentId(target.id),
    label: `${target.label || target.name} Copy`,
    name: `${target.name}（複製）`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const nextAgents = [...state.agents, duplicated];
  await persistAgents(nextAgents, 'エージェントを複製しました');
}

async function handleResetAgent(agentId) {
  if (state.isSavingAgents) return;
  const defaults = getDefaultAgents();
  const defaultAgent = defaults.find((agent) => agent.id === agentId);

  if (!defaultAgent) {
    showToast('初期値が存在しないエージェントです', 'info');
    return;
  }

  const nextAgents = state.agents.map((agent) =>
    agent.id === agentId
      ? {
        ...defaultAgent,
        id: agent.id,
        createdAt: agent.createdAt || defaultAgent.createdAt,
        updatedAt: new Date().toISOString()
      }
      : agent
  );

  await persistAgents(nextAgents, 'エージェントを初期値に戻しました');
}

async function persistAgents(nextAgents, successMessage, options = {}) {
  const { skipAutoSync = false } = options;

  try {
    state.isSavingAgents = true;
    setButtonLoading(addAgentBtn, true, '保存中…');
    await StorageManager.saveAgents(nextAgents);
    state.agents = normalizeAgents(nextAgents, getDefaultAgents());

    const currentSelectedId = await StorageManager.getSelectedAgentId();
    const resolvedSelectedId = resolveSelectedAgentId(state.agents, currentSelectedId);
    if (resolvedSelectedId !== currentSelectedId) {
      await StorageManager.saveSelectedAgentId(resolvedSelectedId);
    }

    renderAgents();
    showToast(successMessage, 'info');

    // [Auto-Sync] Push on save (Silent) - 削除時はスキップ可能
    if (!skipAutoSync) {
      handleSyncSettings({ pushOnly: true, silent: true });
    }

  } catch (error) {
    console.error('[Options] エージェントの保存に失敗しました', error);
    showToast('エージェントの保存に失敗しました', 'warning');
  } finally {
    state.isSavingAgents = false;
    setButtonLoading(addAgentBtn, false, '＋ 新規エージェント');
  }
}

function extractAgentFromCard(card, agentId) {
  const nameInput = card.querySelector('input[id$="-name"]');
  const descriptionInput = card.querySelector('input[id$="-description"]');
  const instructionsInput = card.querySelector('textarea[id$="-instructions"]');

  return {
    id: agentId,
    label: card.querySelector('.agent-badge')?.textContent.trim() || '',
    name: nameInput?.value.trim() || '',
    description: descriptionInput?.value.trim() || '',
    instructions: instructionsInput?.value.trim() || ''
  };
}

function createBlankAgent() {
  return window.AiAgentUtils
    ? window.AiAgentUtils.createAgent({
      label: 'Custom Agent',
      name: '新しいエージェント',
      description: '',
      instructions: ''
    })
    : {
      id: `agent-${Date.now()}`,
      label: 'Custom Agent',
      name: '新しいエージェント',
      description: '',
      instructions: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
}

function normalizeAgents(agents, defaults) {
  const normalized = Array.isArray(agents) ? agents : [];
  const now = new Date().toISOString();
  const defaultMap = new Map(defaults.map((agent) => [agent.id, agent]));

  return normalized.map((agent, index) => {
    const safeId = agent?.id || `agent-${index}`;
    const fallback = defaultMap.get(safeId) || {};
    return {
      id: safeId,
      label: agent?.label || fallback.label || `Agent ${index + 1}`,
      name: agent?.name || fallback.name || '',
      description: agent?.description || fallback.description || '',
      instructions: agent?.instructions || fallback.instructions || '',
      createdAt: agent?.createdAt || fallback.createdAt || now,
      updatedAt: agent?.updatedAt || fallback.updatedAt || now
    };
  });
}

function getDefaultAgents() {
  if (window.AiAgentUtils) {
    return window.AiAgentUtils.getDefaultAgents();
  }
  return state.defaultAgents;
}

function resolveSelectedAgentId(agents, storedId) {
  if (!Array.isArray(agents) || agents.length === 0) {
    return '';
  }

  if (storedId && agents.some((agent) => agent.id === storedId)) {
    return storedId;
  }

  return agents[0].id;
}

function renderAgents() {
  if (!agentsList) return;

  if (!Array.isArray(state.agents) || state.agents.length === 0) {
    agentsList.innerHTML =
      '<div class="empty-state">まだエージェントがありません。右上の「新規エージェント」から作成してください。</div>';
    return;
  }

  agentsList.innerHTML = state.agents
    .map((agent, index) => {
      const safe = {
        id: agent.id || `agent-${index}`,
        label: escapeHtml(agent.label || `Agent ${index + 1}`),
        name: escapeHtml(agent.name || ''),
        description: escapeHtml(agent.description || ''),
        instructions: escapeHtml(agent.instructions || '')
      };
      const nameId = `${safe.id}-name`;
      const descriptionId = `${safe.id}-description`;
      const instructionsId = `${safe.id}-instructions`;

      return `
        <article class="agent-card" data-agent-id="${safe.id}">
          <div class="agent-card-header">
            <span class="agent-badge">${safe.label}</span>
            <div class="agent-card-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-action="duplicate">複製</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="delete">削除</button>
            </div>
          </div>
          <div class="agent-card-body">
            <label class="agent-field" for="${nameId}">
              <span class="field-label">エージェント名</span>
              <input id="${nameId}" type="text" class="input" value="${safe.name}" placeholder="エージェント名">
            </label>
            <label class="agent-field" for="${descriptionId}">
              <span class="field-label">概要</span>
              <input id="${descriptionId}" type="text" class="input" value="${safe.description}" placeholder="このエージェントの用途">
            </label>
            <label class="agent-field agent-field-wide" for="${instructionsId}">
              <span class="field-label">システムプロンプト</span>
              <textarea id="${instructionsId}" class="input" placeholder="AIに指示したいプロンプトを入力">${safe.instructions}</textarea>
            </label>
          </div>
          <div class="agent-card-footer">
            <button type="button" class="btn btn-ghost btn-sm" data-action="reset">初期値に戻す</button>
            <button type="button" class="btn btn-primary btn-sm" data-action="save">保存</button>
          </div>
        </article>
      `;
    })
    .join('');
}

// ========== 削除済みエージェント管理UI (v0.2.7) ==========

/**
 * 削除済みエージェントセクションをレンダリング
 */
async function renderDeletedAgents() {
  const container = document.getElementById('deletedAgentsList');
  if (!container) return;

  const deletedAgents = await StorageManager.getActiveDeletedAgents();

  if (!deletedAgents || deletedAgents.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 12px; color: #999; font-size: 12px;">削除済みのエージェントはありません</div>';
    return;
  }

  container.innerHTML = deletedAgents
    .map((agent) => {
      const expiresAt = new Date(agent.expiresAt);
      const now = new Date();
      const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      const safe = {
        id: agent.id,
        name: escapeHtml(agent.name || agent.label || 'エージェント'),
        deletedAt: new Date(agent.deletedAt).toLocaleDateString('ja-JP')
      };

      return `
        <div class="deleted-agent-item" data-agent-id="${safe.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #eee;">
          <div style="flex: 1;">
            <span style="font-weight: 500;">${safe.name}</span>
            <span style="font-size: 11px; color: #999; margin-left: 8px;">削除: ${safe.deletedAt} / 残り${daysLeft}日</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-ghost btn-sm" data-action="restore" data-agent-id="${safe.id}">復元</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="permanent-delete" data-agent-id="${safe.id}" style="color: #d32f2f;">完全削除</button>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * 削除済みエージェントを復元
 * @param {string} agentId
 */
async function handleRestoreAgent(agentId) {
  if (state.isSavingAgents) return;

  // 削除済みリストから取得して削除
  const restoredAgent = await StorageManager.removeFromDeletedAgents(agentId);
  if (!restoredAgent) {
    showToast('復元するエージェントが見つかりませんでした', 'warning');
    return;
  }

  // deletedAt, expiresAt を削除してクリーンな状態に
  const { deletedAt, expiresAt, ...cleanAgent } = restoredAgent;
  cleanAgent.updatedAt = new Date().toISOString();

  // 現在のエージェントリストに追加
  const nextAgents = [...state.agents, cleanAgent];
  await persistAgents(nextAgents, 'エージェントを復元しました');

  // 削除済みリストUIを更新
  renderDeletedAgents();
}

/**
 * 削除済みエージェントを完全削除
 * @param {string} agentId
 */
async function handlePermanentDeleteAgent(agentId) {
  if (!confirm('このエージェントを完全に削除しますか？\n\n※ この操作は取り消せません。')) {
    return;
  }

  await StorageManager.removeFromDeletedAgents(agentId);
  showToast('エージェントを完全に削除しました', 'info');
  renderDeletedAgents();
}

/**
 * 削除済みエージェントセクションのイベントハンドラを設定
 */
function setupDeletedAgentsEvents() {
  const container = document.getElementById('deletedAgentsList');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const agentId = btn.dataset.agentId;

    if (action === 'restore') {
      await handleRestoreAgent(agentId);
    } else if (action === 'permanent-delete') {
      await handlePermanentDeleteAgent(agentId);
    }
  });
}

// ========== 削除済みエージェント管理UIここまで ==========

function setButtonLoading(button, isLoading, labelWhenIdle) {
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = labelWhenIdle || button.textContent;
  } else if (button.dataset.originalLabel) {
    button.textContent = labelWhenIdle || button.dataset.originalLabel;
    delete button.dataset.originalLabel;
  } else if (labelWhenIdle) {
    button.textContent = labelWhenIdle;
  }
}

function showToast(message, type = 'info') {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentElement === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 240);
  }, 2200);
}

function escapeHtml(unsafe = '') {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleCancelSubscription() {
  const btn = document.getElementById('cancelSubscriptionBtn');
  if (btn.disabled) return;

  if (!confirm('本当に解約しますか？\n解約するとAI機能などの有料機能が即座に停止します。\nこの操作は取り消せません。')) {
    return;
  }

  try {
    setButtonLoading(btn, true, '処理中...');

    // Get Auth Token/User Email
    let email = null;
    let token = null;

    if (window.AuthManager) {
      // Force re-initialization to ensure we have the latest storage state
      await window.AuthManager.init();
      const user = window.AuthManager.getUser();
      email = user ? user.email : null;
      token = await window.AuthManager.getToken();
    }

    // Fallback: Extract email from token if user object is missing
    if (!email && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email || payload.sub;
      } catch (e) {
        console.warn('[Options] Token decode failed:', e);
      }
    }

    // FINAL FALLBACK: Direct storage access
    if (!token && typeof chrome !== 'undefined' && chrome.storage) {
      console.log('[Options] AuthManager had no token, trying direct storage access...');
      const storage = await new Promise(resolve => chrome.storage.local.get(['authToken', 'userEmail'], resolve));
      token = storage.authToken;
      if (!email) email = storage.userEmail;
    }

    // MANUAL INPUT FALLBACK
    const manualInput = document.getElementById('manualTokenInput');
    if (!token && manualInput && manualInput.value.trim()) {
      token = manualInput.value.trim();
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email || payload.sub;
      } catch (e) {
        console.warn('[Options] Manual token decode failed:', e);
      }
    }

    if (!token) {
      console.error('[Options] No token found in AuthManager or Storage.');

      // Debug info for user
      let debugInfo = 'Storage: ';
      try {
        const s = await new Promise(r => chrome.storage.local.get(null, r));
        debugInfo += JSON.stringify(s);
      } catch (e) { debugInfo += e.message; }

      // Show manual input UI instead of just alerting
      const container = document.getElementById('manualAuthContainer');
      if (container) {
        container.style.display = 'block';
        alert('認証情報の取得に失敗しました。\n表示された入力欄にトークンを貼り付けて、再度「解約する」を押してください。\n\n' + debugInfo);
      } else {
        alert('ログイン情報の取得に失敗しました。\n' + debugInfo);
      }

      setButtonLoading(btn, false);
      return;
    }

    // Call API
    const response = await window.ApiClient.cancelSubscription(email);

    if (response && (response.success || response.status === 'canceled')) {
      showToast('解約予約が完了しました。期間終了まで引き続きご利用いただけます。', 'success');

      // DO NOT Logout: User still has access until period end.
      // if (window.AuthManager) {
      //   await window.AuthManager.logout();
      // }

      // UI Update (Reflect Cancellation Scheduled)
      btn.textContent = '解約予約済み (期間終了まで利用可)';
      btn.disabled = true;
      btn.classList.add('btn-disabled');
      btn.style.backgroundColor = '#ccc';
      btn.style.borderColor = '#ccc';
      btn.style.color = '#666';

      // We don't need a Resume button immediately here, or we could add a "Resume" button if API supports it.
      // For now, disabling the cancel button is sufficient to show state.

    } else {
      throw new Error(response.error || '不明なエラー');
    }
  } catch (error) {
    console.error('[Options] 解約処理エラー:', error);

    if (error.message && error.message.includes('401')) {
      showToast('認証セッションが有効期限切れです。一度拡張機能を閉じて再ログインしてください。', 'warning');
      // Optional: Trigger logout cleanup
      if (window.AuthManager) {
        await window.AuthManager.logout();
      }
    } else {
      showToast('解約処理に失敗しました: ' + error.message, 'warning');
    }

    setButtonLoading(btn, false);
  }
}




/**
 * 設定を同期
 * @param {Object} options
 * @param {boolean} options.pushOnly - プッシュ（保存）のみ行う
 * @param {boolean} options.pullOnly - プル（取得）のみ行う
 * @param {boolean} options.silent - Toastを表示しない（エラー以外）
 * @param {HTMLElement} options.btn - 操作対象のボタン要素
 */
async function handleSyncSettings(options = {}) {
  const { pushOnly = false, pullOnly = false, silent = false, btn = null } = options;

  // イベントリスナーから呼ばれた場合は options が Event オブジェクトになるのでリセット
  const isEvent = options instanceof Event;
  const actualPushOnly = isEvent ? false : pushOnly;
  const actualPullOnly = isEvent ? false : pullOnly;
  const actualSilent = isEvent ? false : silent;

  // v0.2.5: ボタンを引数から取得、またはフォールバック
  const targetBtn = btn || document.getElementById('pushSettingsBtn');
  // 自動同期のときはボタン無効状態でも裏で動くことがあるが、基本はチェック
  if (!isEvent && targetBtn && targetBtn.disabled && !actualSilent) return;

  // v0.2.5: ボタンのデフォルトテキストを保存
  const originalBtnText = targetBtn?.textContent || '';

  try {
    if (targetBtn && !actualSilent) setButtonLoading(targetBtn, true, '処理中...');

    // Auth Check
    if (!window.AuthManager) return; // まだロードされていない場合

    // init() は負荷が高いので、すでにUserがいればスキップしたいが、念の為
    // 自動同期の場合は、アクセストークンがない場合などは静かに終了する
    const user = window.AuthManager.getUser();
    if (!user || !user.email) {
      if (!actualSilent) showToast('同期するにはログインが必要です', 'warning');
      return;
    }
    const userId = user.email;

    // 1. Pull Remote Settings (Pullモード または 双方向)
    if (actualPullOnly || (!actualPushOnly)) {
      console.log('[Sync] Pulling settings for', userId);
      const remoteResponse = await window.ApiClient.getSettings(userId);
      console.log('[Sync] API Response:', JSON.stringify(remoteResponse, null, 2));

      // Merge with Local
      if (remoteResponse && remoteResponse.settings) {
        console.log('[Sync] Import remote settings - agents:', remoteResponse.settings.aiAgents?.length || 0);
        console.log('[Sync] Import remote settings - categories:', remoteResponse.settings.templateCategories?.length || 0);
        await StorageManager.importSyncedSettings(remoteResponse.settings);
        // Pullした場合はUIをリロード
        await loadAgents();
        if (!actualSilent) showToast('クラウドから設定を取得しました（エージェント: ' + (remoteResponse.settings.aiAgents?.length || 0) + '件）', 'success');
      } else {
        console.log('[Sync] No settings in response:', remoteResponse);
        if (!actualSilent) showToast('クラウドに保存された設定がありません', 'info');
      }
    }

    // 2. Push to Remote (Pushモード または 双方向)
    if (actualPushOnly || (!actualPullOnly)) {
      // Export Local (Merged)
      const localSettings = await StorageManager.exportSettingsForSync();

      console.log('[Sync] Pushing settings', localSettings);
      const saveResponse = await window.ApiClient.saveSettings(userId, localSettings);

      if (saveResponse && saveResponse.success) {
        if (!actualSilent) showToast('設定をクラウドに保存しました', 'success');
      } else {
        throw new Error(saveResponse?.error || 'Unknown error');
      }
    }

  } catch (error) {
    console.error('[Sync] Error:', error);
    if (!actualSilent) showToast('同期に失敗しました: ' + error.message, 'warning');
  } finally {
    if (targetBtn && !actualSilent) setButtonLoading(targetBtn, false, originalBtnText);
  }
}
