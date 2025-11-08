const claudeApiKeyInput = document.getElementById('claudeApiKey');
const toggleApiKeyVisibilityBtn = document.getElementById('toggleApiKeyVisibility');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const addAgentBtn = document.getElementById('addAgentBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const agentsList = document.getElementById('agentsList');
const toastContainer = document.getElementById('toastContainer');

const DEFAULT_AGENTS = [
  {
    id: 'buzz',
    label: 'Buzz Booster',
    name: 'バズ投稿エージェント',
    description: 'SNSで話題を生むテンション高めの投稿を生成します。',
    instructions: '最新のトレンドやエモーショナルなフレーズを織り交ぜ、ユーザーの共感を誘う構成でテキストを組み立ててください。140文字以内を推奨。'
  },
  {
    id: 'reply',
    label: 'Reply Concierge',
    name: '返信サポートエージェント',
    description: '丁寧かつ簡潔な返信メッセージを提案します。',
    instructions: '相手の意図を汲み取り、礼儀正しく、次のアクションが明確になる文章を提案してください。語尾は柔らかく。'
  },
  {
    id: 'editor',
    label: 'Rewrite Master',
    name: '文章リライトエージェント',
    description: '既存の文章を読みやすくリライトします。',
    instructions: '元のニュアンスを保ちながら、構成・語彙を整え、プロフェッショナルで信頼できる印象の文章に書き換えてください。'
  }
];

document.addEventListener('DOMContentLoaded', initOptions);

async function initOptions() {
  await loadApiKey();
  renderAgents(DEFAULT_AGENTS);
  bindEvents();
}

async function loadApiKey() {
  try {
    const apiKey = await StorageManager.get('claudeApiKey', '');
    claudeApiKeyInput.value = apiKey;
  } catch (error) {
    console.error('[Options] APIキーの読み込みに失敗しました', error);
    showToast('APIキーの読み込みに失敗しました', 'warning');
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
    addAgentBtn.addEventListener('click', () => {
      showToast('エージェントの追加機能は準備中です', 'info');
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      window.close();
    });
  }

  if (agentsList) {
    agentsList.addEventListener('click', (event) => {
      const action = event.target.getAttribute('data-action');
      if (!action) return;

      event.preventDefault();

      const messages = {
        save: 'エージェントの保存機能は準備中です',
        delete: 'エージェントの削除機能は準備中です',
        duplicate: 'エージェントの複製機能は準備中です',
        reset: '初期値へのリセット機能は準備中です'
      };

      showToast(messages[action] || 'この機能は準備中です', 'info');
    });
  }
}

function toggleApiKeyVisibility() {
  const isPassword = claudeApiKeyInput.type === 'password';
  claudeApiKeyInput.type = isPassword ? 'text' : 'password';
  toggleApiKeyVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
}

async function saveApiKey() {
  const apiKey = claudeApiKeyInput.value.trim();
  try {
    await StorageManager.set('claudeApiKey', apiKey);
    showToast('APIキーを保存しました', 'info');
  } catch (error) {
    console.error('[Options] APIキーの保存に失敗しました', error);
    showToast('APIキーの保存に失敗しました', 'warning');
  }
}

function renderAgents(agents) {
  if (!agentsList) return;
  if (!Array.isArray(agents) || agents.length === 0) {
    agentsList.innerHTML = '<div class="empty-state">まだエージェントがありません。右上の「新規エージェント」から作成してください。</div>';
    return;
  }

  agentsList.innerHTML = agents.map((agent, index) => {
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
  }).join('');
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
      toastContainer.removeChild(toast);
    }, 240);
  }, 2200);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
