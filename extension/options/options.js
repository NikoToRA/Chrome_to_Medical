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

  // Auth init
  if (window.AuthManager) {
    await window.AuthManager.init();
    updateAccountUI();
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

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      window.close();
    });
  }

  if (agentsList) {
    agentsList.addEventListener('click', handleAgentAction);
  }

  // Auth event listeners
  const sendMagicLinkBtn = document.getElementById('sendMagicLinkBtn');
  if (sendMagicLinkBtn) {
    sendMagicLinkBtn.addEventListener('click', async () => {
      const email = document.getElementById('loginEmailInput').value;
      if (!email) {
        showToast('メールアドレスを入力してください', 'warning');
        return;
      }
      try {
        showToast('ログインリンクを送信中...', 'info');
        await window.AuthManager.sendMagicLink(email);
        showToast('メールを送信しました。トークンを入力してください。', 'success');
        document.getElementById('verifySection').removeAttribute('hidden');
      } catch (e) {
        showToast('送信に失敗しました: ' + e.message, 'error');
      }
    });
  }

  const verifyTokenBtn = document.getElementById('verifyTokenBtn');
  if (verifyTokenBtn) {
    verifyTokenBtn.addEventListener('click', async () => {
      const token = document.getElementById('loginTokenInput').value;
      if (!token) {
        showToast('トークンを入力してください', 'warning');
        return;
      }
      try {
        showToast('ログイン中...', 'info');
        await window.AuthManager.loginWithToken(token);
        updateAccountUI();
        showToast('ログインしました', 'success');
      } catch (e) {
        showToast('ログインに失敗しました: ' + e.message, 'error');
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await window.AuthManager.logout();
      updateAccountUI();
      showToast('ログアウトしました', 'info');
    });
  }

  const upgradeBtn = document.getElementById('upgradeBtn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', async () => {
      showToast('決済画面を開いています...', 'info');
      await window.AuthManager.subscribe();
    });
  }

  const manageSubscriptionBtn = document.getElementById('manageSubscriptionBtn');
  if (manageSubscriptionBtn) {
    manageSubscriptionBtn.addEventListener('click', async () => {
      showToast('Stripeのカスタマーポータル機能はまだ実装されていません', 'warning');
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
  if (!confirm('このエージェントを削除しますか？')) {
    return;
  }

  const nextAgents = state.agents.filter((agent) => agent.id !== agentId);
  await persistAgents(nextAgents, 'エージェントを削除しました');
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

async function persistAgents(nextAgents, successMessage) {
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


function updateAccountUI() {
  const user = window.AuthManager.getUser();
  const isSubscribed = window.AuthManager.isSubscribed;

  const loginSection = document.getElementById("loginSection");
  const accountStatusSection = document.getElementById("accountStatusSection");
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  const planStatusDisplay = document.getElementById("planStatusDisplay");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const manageSubscriptionBtn = document.getElementById("manageSubscriptionBtn");
  const freePlanMessage = document.getElementById("freePlanMessage");

  if (user) {
    loginSection.setAttribute("hidden", "");
    accountStatusSection.removeAttribute("hidden");
    userEmailDisplay.textContent = user.email;
    
    if (isSubscribed) {
      planStatusDisplay.textContent = "Pro";
      planStatusDisplay.classList.add("pro");
      upgradeBtn.setAttribute("hidden", "");
      manageSubscriptionBtn.removeAttribute("hidden");
      freePlanMessage.setAttribute("hidden", "");
    } else {
      planStatusDisplay.textContent = "Free";
      planStatusDisplay.classList.remove("pro");
      upgradeBtn.removeAttribute("hidden");
      manageSubscriptionBtn.setAttribute("hidden", "");
      freePlanMessage.removeAttribute("hidden");
    }
  } else {
    loginSection.removeAttribute("hidden");
    accountStatusSection.setAttribute("hidden", "");
  }
}
