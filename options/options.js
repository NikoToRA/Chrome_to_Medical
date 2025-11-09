const claudeApiKeyInput = document.getElementById('claudeApiKey');
const toggleApiKeyVisibilityBtn = document.getElementById('toggleApiKeyVisibility');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const addAgentBtn = document.getElementById('addAgentBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const agentsList = document.getElementById('agentsList');
const toastContainer = document.getElementById('toastContainer');
const modelSelector = document.getElementById('modelSelector');
const pasteBehaviorRadios = document.querySelectorAll('input[name="pasteBehavior"]');

const SUPPORTED_MODELS = ['claude-sonnet-4-5', 'claude-haiku-4-5'];
const DEFAULT_MODEL = SUPPORTED_MODELS[0];
const PASTE_BEHAVIORS = ['clear', 'retain'];

const state = {
  defaultAgents: (window.AiAgentUtils && window.AiAgentUtils.getDefaultAgents()) || [],
  agents: [],
  isSavingApiKey: false,
  isSavingAgents: false,
  selectedModel: DEFAULT_MODEL,
  pasteBehavior: 'clear',
  isSavingModel: false
};

document.addEventListener('DOMContentLoaded', initOptions);

async function initOptions() {
  bindEvents();
  await Promise.all([loadApiKey(), loadAgents(), loadSelectedModel()]);
  await loadPasteBehavior();
  setupStorageWatchers();
}

async function loadApiKey() {
  try {
    const apiKey = await StorageManager.getApiKey();
    claudeApiKeyInput.value = apiKey;
  } catch (error) {
    console.error('[Options] APIキーの読み込みに失敗しました', error);
    showToast('APIキーの読み込みに失敗しました', 'warning');
  }
}

async function loadAgents() {
  try {
    const defaults = getDefaultAgents();
    const storedAgents = await StorageManager.getAgents(defaults);
    state.agents = normalizeAgents(storedAgents, defaults);
    renderAgents();
  } catch (error) {
    console.error('[Options] エージェントの読み込みに失敗しました', error);
    showToast('エージェントの読み込みに失敗しました', 'warning');
  }
}

async function loadSelectedModel() {
  try {
    const storedModel = await StorageManager.getSelectedModel(DEFAULT_MODEL);
    const isValid = SUPPORTED_MODELS.includes(storedModel);
    const resolvedModel = isValid ? storedModel : DEFAULT_MODEL;
    state.selectedModel = resolvedModel;
    if (modelSelector) {
      modelSelector.value = resolvedModel;
    }
    if (!isValid) {
      await StorageManager.saveSelectedModel(resolvedModel);
    }
  } catch (error) {
    console.error('[Options] モデル設定の読み込みに失敗しました', error);
    showToast('モデル設定の読み込みに失敗しました', 'warning');
  }
}

async function loadPasteBehavior() {
  try {
    const storedBehavior = await StorageManager.getPasteBehavior('clear');
    const resolvedBehavior = PASTE_BEHAVIORS.includes(storedBehavior) ? storedBehavior : 'clear';
    state.pasteBehavior = resolvedBehavior;
    pasteBehaviorRadios.forEach((radio) => {
      radio.checked = radio.value === resolvedBehavior;
    });
    if (!PASTE_BEHAVIORS.includes(storedBehavior)) {
      await StorageManager.savePasteBehavior(resolvedBehavior);
    }
  } catch (error) {
    console.error('[Options] ペースト挙動の読み込みに失敗しました', error);
    showToast('テキスト送信後の挙動設定を読み込めませんでした', 'warning');
  }
}

function bindEvents() {
  if (toggleApiKeyVisibilityBtn) {
    toggleApiKeyVisibilityBtn.addEventListener('click', toggleApiKeyVisibility);
  }

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', saveApiKey);
  }

  if (addAgentBtn) {
    addAgentBtn.addEventListener('click', handleAddAgent);
  }

  if (modelSelector) {
    modelSelector.addEventListener('change', handleModelChange);
  }

  pasteBehaviorRadios.forEach((radio) => {
    radio.addEventListener('change', handlePasteBehaviorChange);
  });

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      window.close();
    });
  }

  if (agentsList) {
    agentsList.addEventListener('click', handleAgentAction);
  }
}

function setupStorageWatchers() {
  if (!chrome?.storage?.onChanged) return;

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[StorageManager.STORAGE_KEYS.CLAUDE_API_KEY]) {
      const newValue = changes[StorageManager.STORAGE_KEYS.CLAUDE_API_KEY].newValue || '';
      if (claudeApiKeyInput && claudeApiKeyInput.value !== newValue) {
        claudeApiKeyInput.value = newValue;
        if (!state.isSavingApiKey) {
          showToast('他のタブで更新されたAPIキーを反映しました', 'info');
        }
      }
    }

    if (changes[StorageManager.STORAGE_KEYS.AI_AGENTS]) {
      const defaults = getDefaultAgents();
      const newAgents = changes[StorageManager.STORAGE_KEYS.AI_AGENTS].newValue;
      state.agents = normalizeAgents(newAgents, defaults);
      renderAgents();
      if (!state.isSavingAgents) {
        showToast('エージェント設定を同期しました', 'info');
      }
    }

    if (changes[StorageManager.STORAGE_KEYS.AI_SELECTED_MODEL]) {
      const rawModel = changes[StorageManager.STORAGE_KEYS.AI_SELECTED_MODEL].newValue || DEFAULT_MODEL;
      const resolvedModel = SUPPORTED_MODELS.includes(rawModel) ? rawModel : DEFAULT_MODEL;
      state.selectedModel = resolvedModel;
      if (modelSelector && modelSelector.value !== resolvedModel) {
        modelSelector.value = resolvedModel;
      }
      if (!state.isSavingModel) {
        showToast('モデル設定を同期しました', 'info');
      }
      if (!SUPPORTED_MODELS.includes(rawModel)) {
        StorageManager.saveSelectedModel(resolvedModel);
      }
    }

    if (changes[StorageManager.STORAGE_KEYS.PASTE_BEHAVIOR]) {
      const rawBehavior = changes[StorageManager.STORAGE_KEYS.PASTE_BEHAVIOR].newValue || 'clear';
      const resolvedBehavior = PASTE_BEHAVIORS.includes(rawBehavior) ? rawBehavior : 'clear';
      state.pasteBehavior = resolvedBehavior;
      pasteBehaviorRadios.forEach((radio) => {
        radio.checked = radio.value === resolvedBehavior;
      });
      if (!PASTE_BEHAVIORS.includes(rawBehavior)) {
        StorageManager.savePasteBehavior(resolvedBehavior);
      }
      showToast('テキスト送信後の挙動を同期しました', 'info');
    }
  });
}

function toggleApiKeyVisibility() {
  const isPassword = claudeApiKeyInput.type === 'password';
  claudeApiKeyInput.type = isPassword ? 'text' : 'password';
  toggleApiKeyVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
}

async function saveApiKey() {
  if (state.isSavingApiKey) return;
  const apiKey = claudeApiKeyInput.value.trim();
  const validationError = validateApiKey(apiKey);

  if (validationError) {
    showToast(validationError, 'warning');
    return;
  }

  try {
    state.isSavingApiKey = true;
    setButtonLoading(saveApiKeyBtn, true, '保存中…');
    await StorageManager.saveApiKey(apiKey);
    const message = apiKey ? 'APIキーを保存しました' : 'APIキーをクリアしました';
    showToast(message, 'info');
  } catch (error) {
    console.error('[Options] APIキーの保存に失敗しました', error);
    showToast('APIキーの保存に失敗しました', 'warning');
  } finally {
    state.isSavingApiKey = false;
    setButtonLoading(saveApiKeyBtn, false, '保存する');
  }
}

function validateApiKey(apiKey) {
  if (!apiKey) {
    return null; // 空文字はクリア操作として許容
  }

  const basicPattern = /^sk-[a-z0-9-_]{5,}$/i;
  if (!basicPattern.test(apiKey)) {
    return 'APIキーの形式が正しくありません（例: sk-xxxxx）。';
  }

  return null;
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

async function handlePasteBehaviorChange(event) {
  const { value } = event.target;
  if (!PASTE_BEHAVIORS.includes(value)) {
    showToast('選択した設定は利用できません', 'warning');
    pasteBehaviorRadios.forEach((radio) => {
      radio.checked = radio.value === state.pasteBehavior;
    });
    return;
  }

  state.pasteBehavior = value;
  try {
    await StorageManager.savePasteBehavior(value);
    showToast('テキスト送信後の挙動を保存しました', 'info');
  } catch (error) {
    console.error('[Options] ペースト挙動の保存に失敗しました', error);
    showToast('テキスト送信後の挙動の保存に失敗しました', 'warning');
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
