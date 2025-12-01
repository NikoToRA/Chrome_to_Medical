/**
 * サイドパネルのメインロジック
 */

// DOM要素の取得
const textEditor = document.getElementById('textEditor');
const addImageBtn = document.getElementById('addImageBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const imageCount = document.getElementById('imageCount');
// 定型文UI
const templateList = document.getElementById('templateList');
const manageTemplatesBtn = document.getElementById('manageTemplatesBtn');
const clearTextBtn = document.getElementById('clearTextBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const pasteToPageBtn = document.getElementById('pasteToPageBtn');
const copyEditorTextBtn = document.getElementById('copyEditorTextBtn');
const captureScreenshotBtn = document.getElementById('captureScreenshotBtn');
const captureSelectScreenshotBtn = document.getElementById('captureSelectScreenshotBtn');
const templateModal = document.getElementById('templateModal');
const closeTemplateModal = document.getElementById('closeTemplateModal');
const templateCategorySelect = document.getElementById('templateCategorySelect');
const newTemplateInput = document.getElementById('newTemplateInput');
const addTemplateBtn = document.getElementById('addTemplateBtn');
const templateManageList = document.getElementById('templateManageList');
const templateCategoryToggle = document.getElementById('templateCategoryToggle');
const newCategoryInput = document.getElementById('newCategoryInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryList = document.getElementById('categoryList');
const platformIndicator = document.getElementById('platformIndicator');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-content[role="tabpanel"]');
const sendAiToTextBtn = document.getElementById('sendAiToTextBtn');
const pasteAiDirectBtn = document.getElementById('pasteAiDirectBtn');
const copyAiBtn = document.getElementById('copyAiBtn');
const agentSelector = document.getElementById('agentSelector');
const aiChatMessages = document.getElementById('aiChatMessages');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSendBtn = document.getElementById('aiChatSendBtn');
const aiChatForm = document.getElementById('aiChatForm');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const retainTextToggle = document.getElementById('retainTextToggle');
const clearChatBtn = document.getElementById('clearChatBtn');
const directTemplatePasteToggle = document.getElementById('directTemplatePasteToggle');
// 状態管理
let currentImages = [];
let templates = { diagnoses: [], medications: [], phrases: [] };
let templateCategories = [];
let currentTemplateCategory = 'diagnoses';
let currentPlatform = null;
const aiState = {
  agents: [],
  selectedAgentId: '',
  selectedModel: '' // Managed by Azure
};
let isAgentSelectionUpdateSilent = false;

// テキスト保持設定
let retainTextAfterPaste = false;
let directTemplatePaste = false;

// 初期化
async function init() {
  await Promise.all([loadEditorState(), loadAiState()]);
  await detectPlatform();
  setupTabNavigation();
  setupEventListeners();
  setupPlatformDetection();
  setupDragAndDrop();
  setupStorageObservers();
  setupTextRetentionToggle();
  await setupTemplateDirectPasteToggle();
  setupJstTimeDisplay();
  setupAuthTokenListener();
  await checkAuthAndUpdateUI();
  renderCategoryTabs();
  renderTemplates();
  renderImages();
}

// 認証状態をチェックしてUIを更新
async function checkAuthAndUpdateUI() {
  if (window.AuthManager) {
    const token = await window.AuthManager.getToken();
    const user = window.AuthManager.getUser();
    
    if (!token || !user) {
      // トークンがない場合、ログインを促す
      showAuthRequiredUI();
    } else {
      // トークンがある場合、認証UIを非表示
      hideAuthRequiredUI();
      // 購読状態を確認
      await window.AuthManager.checkSubscription();
    }
  }
}

// 認証が必要な場合のUIを表示
function showAuthRequiredUI() {
  // AIチャットタブを無効化
  const aiTab = document.querySelector('[data-tab-target="aiTab"]');
  const aiTabContent = document.querySelector('[data-tab="aiTab"]');
  
  if (aiTabContent) {
    let authOverlay = document.getElementById('authRequiredOverlay');
    if (!authOverlay) {
      authOverlay = document.createElement('div');
      authOverlay.id = 'authRequiredOverlay';
      authOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
        text-align: center;
      `;
      authOverlay.innerHTML = `
        <h2 style="margin-bottom: 20px; color: #333;">🔒 ログインが必要です</h2>
        <p style="margin-bottom: 20px; color: #666;">AI機能を使用するには、ログインが必要です。</p>
        
        <div style="width: 100%; max-width: 400px; margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #333; font-weight: bold;">
            トークンを入力（手動ログイン）
          </label>
          <textarea 
            id="manualTokenInput" 
            placeholder="JWTトークンを貼り付けてください"
            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; font-family: monospace; resize: vertical; min-height: 80px;"
          ></textarea>
          <button id="submitTokenBtn" class="btn btn-primary" style="margin-top: 10px; width: 100%; padding: 10px;">
            トークンを送信
          </button>
        </div>
        
        <div style="width: 100%; max-width: 400px; padding-top: 20px; border-top: 1px solid #eee;">
          <button id="goToLoginBtn" class="btn btn-secondary" style="padding: 12px 24px; font-size: 14px; width: 100%;">
            Landing Pageでログイン
          </button>
          <p style="margin-top: 15px; font-size: 12px; color: #999; text-align: center;">
            決済完了後、自動的にログインされます
          </p>
        </div>
      `;
      aiTabContent.style.position = 'relative';
      aiTabContent.appendChild(authOverlay);
      
      // ログインボタンのイベント
      document.getElementById('goToLoginBtn').addEventListener('click', () => {
        window.open('https://stkarteai1763705952.z11.web.core.windows.net', '_blank');
      });
      
      // トークン送信ボタンのイベント
      const submitTokenBtn = document.getElementById('submitTokenBtn');
      const manualTokenInput = document.getElementById('manualTokenInput');
      
      if (submitTokenBtn && manualTokenInput) {
        submitTokenBtn.addEventListener('click', async () => {
          const token = manualTokenInput.value.trim();
          if (!token) {
            showNotification('トークンを入力してください', 'error');
            return;
          }
          
          try {
            // トークンからメールアドレスを抽出
            const payload = JSON.parse(atob(token.split('.')[1]));
            const email = payload.email || payload.sub || 'unknown@example.com';
            
            // AuthManagerにトークンを設定
            if (window.AuthManager) {
              await window.AuthManager.setToken(token, email);
              window.AuthManager.user = { email: email };
              
              // 購読状態を確認
              await window.AuthManager.checkSubscription();
              
              showNotification('ログインに成功しました！', 'success');
              hideAuthRequiredUI();
              
              // ストレージにも保存（background.jsと同期）
              chrome.storage.local.set({
                authToken: token,
                userEmail: email
              });
            }
          } catch (error) {
            console.error('[SidePanel] トークン処理エラー:', error);
            showNotification('トークンの形式が正しくありません: ' + error.message, 'error');
          }
        });
      }
    }
  }
}

// 認証UIを非表示
function hideAuthRequiredUI() {
  const authOverlay = document.getElementById('authRequiredOverlay');
  if (authOverlay) {
    authOverlay.remove();
  }
}

// 認証トークン受信リスナー
function setupAuthTokenListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'authTokenReceived' && request.token && request.email) {
      console.log('[SidePanel] ✅ 認証トークンを受信しました:', request.email);
      
      // AuthManagerにトークンを設定
      if (window.AuthManager) {
        window.AuthManager.setToken(request.token, request.email).then(() => {
          // ユーザー情報を更新
          window.AuthManager.user = { email: request.email };
          // 購読状態を確認
          window.AuthManager.checkSubscription().then(() => {
            console.log('[SidePanel] ✅ 認証完了、購読状態を確認しました');
            showNotification('ログインに成功しました！', 'success');
            // 認証UIを非表示
            hideAuthRequiredUI();
            // UIを再チェック
            checkAuthAndUpdateUI();
          });
        });
      }
      
      sendResponse({ success: true });
    }
  });
  
  // ストレージ変更を監視（他のタブやbackground.jsからの変更を検知）
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.authToken) {
      console.log('[SidePanel] ストレージからトークン変更を検知');
      checkAuthAndUpdateUI();
    }
  });
}

// プラットフォーム検出
async function detectPlatform() {
  try {
    chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
      if (response && response.tab) {
        // 古いDetectorの代わりに新しいAdapterManagerを使用
        const adapter = window.EmrAdapterManager ? window.EmrAdapterManager.getAdapterForUrl(response.tab.url) : null;

        if (adapter) {
          currentPlatform = adapter.id;
          updatePlatformIndicator(adapter.name);
        } else {
          // フォールバック
          const platform = PlatformDetector.detectFromURL(response.tab.url);
          currentPlatform = platform;
          updatePlatformIndicator(PlatformDetector.getPlatformName(platform));
        }
      }
    });
  } catch (error) {
    console.error('プラットフォーム検出に失敗しました:', error);
  }
}

// プラットフォーム検出の監視設定（タブ変更時に自動更新）
function setupPlatformDetection() {
  // ウィンドウフォーカス時にプラットフォームを更新
  window.addEventListener('focus', async () => {
    await detectPlatform();
  });

  // 定期的にプラットフォームを確認（タブ変更を検出）
  setInterval(async () => {
    await detectPlatform();
  }, 1000);
}

// プラットフォーム表示の更新
function updatePlatformIndicator(platformNameOrCode) {
  if (platformNameOrCode) {
    // コードが渡された場合は名前を取得（互換性のため）
    let displayName = platformNameOrCode;
    if (PlatformDetector && PlatformDetector.getPlatformName && /^[a-z_]+$/.test(platformNameOrCode)) {
      // 英数字のみの場合はコードとみなして変換を試みる（ただしAdapterから直接名前が来ることも想定）
      // ここでは単純に表示する
    }

    platformIndicator.textContent = `🏥 ${displayName}`;
    platformIndicator.style.display = 'block';
    platformIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  } else {
    platformIndicator.style.display = 'none';
  }
}

// エディタ用データの読み込み
async function loadEditorState() {
  const text = await StorageManager.getText();
  const images = await StorageManager.getImages();
  const savedTemplates = await StorageManager.getTemplates();
  const savedCategories = await StorageManager.getTemplateCategories();
  const savedDirect = await StorageManager.getTemplatesDirectPaste();

  textEditor.value = text;
  currentImages = images || [];
  templates = savedTemplates || {};
  templateCategories = savedCategories || [];

  // カテゴリが存在しない場合はデフォルトを設定（通常はStorageManagerがデフォルトを返すはず）
  if (!templateCategories.length) {
    templateCategories = [
      { id: 'diagnoses', name: '病名' },
      { id: 'medications', name: '薬剤' },
      { id: 'phrases', name: '定型文' }
    ];
  }

  // 現在のカテゴリが有効か確認
  if (!templateCategories.find(c => c.id === currentTemplateCategory)) {
    currentTemplateCategory = templateCategories[0].id;
  }

  directTemplatePaste = Boolean(savedDirect);
}

// テキスト保持トグルの設定
async function setupTextRetentionToggle() {
  // ストレージから設定を読み込み
  retainTextAfterPaste = await StorageManager.getTextRetentionSetting();

  // トグルの初期状態を設定
  if (retainTextToggle) {
    retainTextToggle.checked = retainTextAfterPaste;

    // イベントリスナー設定
    retainTextToggle.addEventListener('change', async (e) => {
      retainTextAfterPaste = e.target.checked;
      await StorageManager.saveTextRetentionSetting(retainTextAfterPaste);

      const status = retainTextAfterPaste ? '保持' : 'クリア';
      showNotification(`貼り付け後のテキストを${status}する設定に変更しました`);
    });
  }
}

// AI設定の読み込み
async function loadAiState() {
  try {
    const defaults = await loadPackagedAgentDefaults();
    const [storedAgents, storedSelectedId] = await Promise.all([
      StorageManager.getAgents(defaults),
      StorageManager.getSelectedAgentId()
    ]);

    aiState.agents = normalizeAgents(storedAgents, defaults);
    aiState.selectedAgentId = resolveSelectedAgentId(aiState.agents, storedSelectedId);
    aiState.selectedAgentId = resolveSelectedAgentId(aiState.agents, storedSelectedId);
    aiState.selectedModel = ''; // Managed by Azure

    if (aiState.selectedAgentId !== storedSelectedId) {
      await StorageManager.saveSelectedAgentId(aiState.selectedAgentId);
    }

    renderAgentSelector();
    await loadChatHistory();
  } catch (error) {
    console.error('[SidePanel] AI設定の読み込みに失敗しました', error);
    showNotification('AI設定の読み込みに失敗しました');
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

// データの保存
async function saveData() {
  await StorageManager.saveText(textEditor.value);
  await StorageManager.saveImages(currentImages);
  await StorageManager.saveTemplates(templates);
}

// タブをアクティブにする関数（グローバルスコープ）
function activateTab(targetId) {
  if (!tabButtons.length || !tabPanels.length) {
    return;
  }

  tabButtons.forEach((btn) => {
    const isActive = btn.getAttribute('data-tab-target') === targetId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.getAttribute('data-tab') === targetId;
    panel.classList.toggle('active', isActive);
    if (isActive) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', 'true');
    }
  });
}

// タブ切り替えを設定
function setupTabNavigation() {
  if (!tabButtons.length || !tabPanels.length) {
    return;
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-tab-target');
      if (!target) return;
      activateTab(target);
    });
  });

  // 初期タブ設定
  const defaultTab = Array.from(tabButtons).find((btn) => btn.classList.contains('active'))?.getAttribute('data-tab-target') || tabButtons[0].getAttribute('data-tab-target');
  activateTab(defaultTab);
}

// テキスト編集タブに切り替え
function switchToTextTab() {
  activateTab('textTab');
}

// イベントリスナーの設定
function setupEventListeners() {
  // テキスト編集
  textEditor.addEventListener('input', () => {
    saveData();
  });

  // 画像追加
  addImageBtn.addEventListener('click', () => {
    imageInput.click();
  });

  imageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    await addImages(files);
    imageInput.value = '';
  });

  // スクリーンショット取得
  captureScreenshotBtn.addEventListener('click', async () => {
    await captureScreenshot();
  });

  // 選択してスクリーンショット取得
  captureSelectScreenshotBtn.addEventListener('click', async () => {
    await captureSelectScreenshot();
  });

  // 定型文 管理モーダル
  if (manageTemplatesBtn) {
    manageTemplatesBtn.addEventListener('click', () => {
      if (templateCategorySelect) templateCategorySelect.value = currentTemplateCategory;
      renderCategoryManagement(); // カテゴリ管理リストも表示
      renderTemplateManageList();
      templateModal.classList.add('active');
    });
  }

  if (closeTemplateModal) {
    closeTemplateModal.addEventListener('click', () => {
      templateModal.classList.remove('active');
    });
  }

  if (templateModal) {
    templateModal.addEventListener('click', (e) => {
      if (e.target === templateModal) {
        templateModal.classList.remove('active');
      }
    });
  }

  if (addTemplateBtn) {
    addTemplateBtn.addEventListener('click', () => addTemplate());
  }

  if (newTemplateInput) {
    newTemplateInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTemplate();
    });
  }

  // カテゴリ追加イベント
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => addCategory());
  }

  if (newCategoryInput) {
    newCategoryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addCategory();
    });
  }

  // 日本時間貼り付けボタン（定型文エリアの下）- カルテに直接貼り付け
  const pasteJstTimeBtn = document.getElementById('pasteJstTimeBtn');
  if (pasteJstTimeBtn) {
    pasteJstTimeBtn.addEventListener('click', () => {
      const jstTime = getJstTimeString();
      // カルテに直接貼り付け
      chrome.runtime.sendMessage({
        action: 'pasteToActiveTab',
        text: jstTime,
        images: []
      }, (response) => {
        if (chrome.runtime.lastError) {
          showNotification('日本時間の貼り付けに失敗しました: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success === false) {
          showNotification('日本時間の貼り付けに失敗しました: ' + (response.error || '不明なエラー'));
        } else {
          showNotification('日本時間をカルテに貼り付けました');
        }
      });
    });
  }

  if (templateCategorySelect) {
    templateCategorySelect.addEventListener('change', () => renderTemplateManageList());
  }

  clearTextBtn.addEventListener('click', async () => {
    await clearText();
  });

  // Allクリア機能
  clearAllBtn.addEventListener('click', async () => {
    // ユーザー操作時の確認ダイアログを表示しない
    await clearAll({ skipConfirm: true });
  });

  // ページに貼り付ける機能
  pasteToPageBtn.addEventListener('click', async () => {
    await pasteToPage();
  });

  // テキストをコピーする機能
  if (copyEditorTextBtn) {
    copyEditorTextBtn.addEventListener('click', async () => {
      await copyEditorText();
    });
  }

  if (sendAiToTextBtn) {
    sendAiToTextBtn.addEventListener('click', async () => {
      await sendLatestAssistantMessageToEditor();
    });
  }

  if (pasteAiDirectBtn) {
    pasteAiDirectBtn.addEventListener('click', async () => {
      await pasteLatestAssistantMessageDirect();
    });
  }

  if (copyAiBtn) {
    copyAiBtn.addEventListener('click', async () => {
      await copyLatestAssistantMessage();
    });
  }

  if (agentSelector) {
    agentSelector.addEventListener('change', handleAgentSelectorChange);
  }

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      await clearCurrentChatSession();
      showNotification('チャットを全消ししました');
    });
  }

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      if (chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/options.html'));
      }
    });
  }

  if (aiChatForm) {
    aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAiChatSend();
    });
  } else if (aiChatSendBtn) {
    aiChatSendBtn.addEventListener('click', () => {
      handleAiChatSend();
    });
  }

  if (aiChatInput) {
    aiChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        handleAiChatSend();
      }
    });
  }

  // 画像ツールのトグル
  const toggleImageToolsBtn = document.getElementById('toggleImageToolsBtn');
  const imageTools = document.getElementById('imageTools');
  if (toggleImageToolsBtn && imageTools) {
    toggleImageToolsBtn.addEventListener('click', () => {
      const isHidden = imageTools.hasAttribute('hidden');
      if (isHidden) {
        imageTools.removeAttribute('hidden');
        toggleImageToolsBtn.textContent = '画像ツールを隠す';
        toggleImageToolsBtn.setAttribute('aria-expanded', 'true');
      } else {
        imageTools.setAttribute('hidden', '');
        toggleImageToolsBtn.textContent = '画像ツールを表示';
        toggleImageToolsBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

// ドラッグ&ドロップ機能の設定
function setupDragAndDrop() {
  const dropZone = imagePreview;

  if (!dropZone) {
    console.error('[SidePanel] imagePreview要素が見つかりません');
    return;
  }

  // ドラッグオーバー時の処理
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'copy';
  });

  // ドラッグリーブ時の処理
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  // ドロップ時の処理
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    try {
      // DataTransferからデータを取得
      const data = e.dataTransfer.getData('text/plain');

      if (data) {
        try {
          const parsedData = JSON.parse(data);

          if (parsedData.type === 'chrome-to-x-image') {
            // Base64データが含まれている場合
            const imageData = parsedData.imageData;
            await addImageFromData(imageData);
          } else if (parsedData.type === 'chrome-to-x-image-url') {
            // URLのみの場合（クロスオリジン）
            await addImageFromUrl(parsedData.url, parsedData.alt);
          }
        } catch (error) {
          console.log('[SidePanel] JSON解析エラー、通常のテキストとして処理:', error);
        }
      }

      // ファイルがドロップされた場合（ローカルファイル）
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          await addImages(imageFiles);
        }
      }
    } catch (error) {
      console.error('[SidePanel] ドロップ処理エラー:', error);
      showNotification('画像の追加に失敗しました');
    }
  });

  console.log('[SidePanel] ドラッグ&ドロップ機能を有効化');
}

// URLから画像を追加
async function addImageFromUrl(url, alt) {
  try {
    showNotification('画像を取得中...');

    // background script経由で画像を取得（CORS回避）
    chrome.runtime.sendMessage({
      action: 'fetchImage',
      url: url
    }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SidePanel] 画像取得エラー:', chrome.runtime.lastError);
        showNotification('画像の取得に失敗しました: ' + chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success && response.base64) {
        const imageData = {
          id: Date.now() + Math.random(),
          base64: response.base64,
          name: alt || `image_${Date.now()}.png`,
          url: url
        };

        await addImageFromData(imageData);
      } else {
        showNotification('画像の取得に失敗しました');
      }
    });
  } catch (error) {
    console.error('[SidePanel] URLからの画像追加エラー:', error);
    showNotification('画像の追加に失敗しました');
  }
}

// 画像データを追加
async function addImageFromData(imageData) {
  // Xの画像制限（4枚まで）
  if (currentImages.length >= 4) {
    showNotification('画像は最大4枚まで追加できます');
    return;
  }

  currentImages.push(imageData);
  await saveData();
  renderImages();
  showNotification('画像を追加しました');
}

// 画像の追加
async function addImages(files) {
  const validFiles = files.filter(file => ImageManager.validateImageFile(file));

  if (validFiles.length === 0) {
    alert('有効な画像ファイルを選択してください。');
    return;
  }

  // Xの画像制限（4枚まで）
  const remainingSlots = 4 - currentImages.length;
  if (remainingSlots <= 0) {
    alert('画像は最大4枚まで追加できます。');
    return;
  }

  const filesToAdd = validFiles.slice(0, remainingSlots);

  for (const file of filesToAdd) {
    try {
      const base64 = await ImageManager.fileToBase64(file);
      currentImages.push({
        id: Date.now() + Math.random(),
        base64: base64,
        name: file.name
      });
    } catch (error) {
      console.error('画像の読み込みに失敗しました:', error);
    }
  }

  await saveData();
  renderImages();
}

// スクリーンショット取得
async function captureScreenshot() {
  try {
    showNotification('スクリーンショットを取得中...');

    chrome.runtime.sendMessage({ action: 'captureScreenshot' }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SidePanel] スクリーンショット取得エラー:', chrome.runtime.lastError);
        showNotification('スクリーンショットの取得に失敗しました: ' + chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success === false) {
        console.error('[SidePanel] スクリーンショット取得失敗:', response);
        showNotification('スクリーンショットの取得に失敗しました: ' + (response.error || '不明なエラー'));
        return;
      }

      if (response && response.success && response.dataUrl) {
        // Base64データURLを画像として追加
        const base64 = response.dataUrl;
        const imageData = {
          id: Date.now() + Math.random(),
          base64: base64,
          name: `スクリーンショット_${new Date().toISOString().replace(/[:.]/g, '-')}.png`
        };

        // Xの画像制限（4枚まで）
        if (currentImages.length >= 4) {
          showNotification('画像は最大4枚まで追加できます');
          return;
        }

        currentImages.push(imageData);
        await saveData();
        renderImages();
        showNotification('スクリーンショットを追加しました');
      }
    });
  } catch (error) {
    console.error('スクリーンショット取得に失敗しました:', error);
    showNotification('スクリーンショットの取得に失敗しました');
  }
}

// 選択してスクリーンショット取得
async function captureSelectScreenshot() {
  try {
    showNotification('範囲を選択してください...');

    // まず、content scriptに選択範囲を指定してもらう
    chrome.runtime.sendMessage({ action: 'startSelectionScreenshot' }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SidePanel] 選択範囲スクリーンショットエラー:', chrome.runtime.lastError);
        showNotification('選択範囲の指定に失敗しました: ' + chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success === false) {
        if (response.error === 'キャンセルされました') {
          showNotification('キャンセルされました');
          return;
        }
        console.error('[SidePanel] 選択範囲スクリーンショット失敗:', response);
        showNotification('選択範囲の指定に失敗しました: ' + (response.error || '不明なエラー'));
        return;
      }

      if (response && response.success && response.selection) {
        // 選択範囲が取得できたので、スクリーンショットを取得して切り抜く
        const selection = response.selection;
        showNotification('スクリーンショットを取得中...');

        chrome.runtime.sendMessage({
          action: 'captureSelectScreenshot',
          selection: selection
        }, async (screenshotResponse) => {
          if (chrome.runtime.lastError) {
            console.error('[SidePanel] スクリーンショット取得エラー:', chrome.runtime.lastError);
            showNotification('スクリーンショットの取得に失敗しました: ' + chrome.runtime.lastError.message);
            return;
          }

          if (screenshotResponse && screenshotResponse.success === false) {
            console.error('[SidePanel] スクリーンショット取得失敗:', screenshotResponse);
            showNotification('スクリーンショットの取得に失敗しました: ' + (screenshotResponse.error || '不明なエラー'));
            return;
          }

          if (screenshotResponse && screenshotResponse.success && screenshotResponse.dataUrl) {
            // 選択範囲を切り抜く
            const img = new Image();
            img.onload = () => {
              // デバッグ情報を出力
              console.log('[Chrome to X] スクリーンショット情報:', {
                screenshotSize: {
                  width: img.width,
                  height: img.height
                },
                selection: selection,
                devicePixelRatio: selection.devicePixelRatio || window.devicePixelRatio || 1
              });

              // スクリーンショット画像のサイズと選択範囲の座標を比較
              // デバイスピクセル比が考慮されている場合、座標は既に調整済み
              const devicePixelRatio = selection.devicePixelRatio || window.devicePixelRatio || 1;

              // 実際の切り抜き座標を計算
              // スクリーンショット画像はデバイスピクセル比を考慮したサイズになっている
              const cropX = selection.x;
              const cropY = selection.y;
              const cropWidth = selection.width;
              const cropHeight = selection.height;

              console.log('[Chrome to X] 切り抜き座標:', {
                cropX: cropX,
                cropY: cropY,
                cropWidth: cropWidth,
                cropHeight: cropHeight,
                screenshotWidth: img.width,
                screenshotHeight: img.height,
                isWithinBounds: cropX >= 0 && cropY >= 0 &&
                  (cropX + cropWidth) <= img.width &&
                  (cropY + cropHeight) <= img.height
              });

              // Canvasを作成して選択範囲を切り抜く
              const canvas = document.createElement('canvas');
              canvas.width = cropWidth;
              canvas.height = cropHeight;
              const ctx = canvas.getContext('2d');

              // スクリーンショット画像から選択範囲を描画
              ctx.drawImage(
                img,
                cropX, cropY, cropWidth, cropHeight,
                0, 0, cropWidth, cropHeight
              );

              // Base64データURLに変換
              const croppedDataUrl = canvas.toDataURL('image/png');

              // Base64データURLを画像として追加
              const imageData = {
                id: Date.now() + Math.random(),
                base64: croppedDataUrl,
                name: `スクリーンショット_選択_${new Date().toISOString().replace(/[:.]/g, '-')}.png`
              };

              // Xの画像制限（4枚まで）
              if (currentImages.length >= 4) {
                showNotification('画像は最大4枚まで追加できます');
                return;
              }

              currentImages.push(imageData);
              saveData();
              renderImages();
              showNotification('選択範囲をスクリーンショットとして保存しました');
            };
            img.src = screenshotResponse.dataUrl;
          }
        });
      }
    });
  } catch (error) {
    console.error('選択範囲スクリーンショット取得に失敗しました:', error);
    showNotification('選択範囲スクリーンショットの取得に失敗しました');
  }
}

// 画像の削除
async function removeImage(imageId) {
  currentImages = currentImages.filter(img => img.id !== imageId);
  await saveData();
  renderImages();
}

// 画像の表示
function renderImages() {
  imageCount.textContent = `${currentImages.length}枚`;

  if (currentImages.length === 0) {
    imagePreview.innerHTML = '';
    return;
  }

  imagePreview.innerHTML = currentImages.map(img => `
    <div class="image-item" draggable="true" data-image-id="${img.id}">
      <img src="${img.base64}" alt="${img.name}" draggable="false">
      <button class="remove-btn" data-image-id="${img.id}">&times;</button>
    </div>
  `).join('');

  // 削除ボタンのイベントリスナーを追加
  imagePreview.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // ドラッグイベントを防ぐ
      const imageId = parseFloat(btn.getAttribute('data-image-id'));
      removeImage(imageId);
    });
  });

  // ドラッグ&ドロップ機能を追加（ページへのドロップ用）
  imagePreview.querySelectorAll('.image-item').forEach(item => {
    const imageId = parseFloat(item.getAttribute('data-image-id'));
    const image = currentImages.find(img => img.id === imageId);

    if (!image) return;

    // ドラッグ開始
    item.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      console.log('[SidePanel] 画像のドラッグ開始:', image.name);

      // 画像データをDataTransferに設定
      const imageData = {
        type: 'chrome-to-x-image',
        imageData: {
          base64: image.base64,
          name: image.name,
          id: image.id
        }
      };

      e.dataTransfer.setData('text/plain', JSON.stringify(imageData));
      e.dataTransfer.effectAllowed = 'copy';

      // 画像のプレビューを設定（オプション）
      const img = item.querySelector('img');
      if (img) {
        e.dataTransfer.setDragImage(img, 0, 0);
      }
    });

    // ドラッグ終了
    item.addEventListener('dragend', (e) => {
      console.log('[SidePanel] 画像のドラッグ終了');
    });
  });
}

// カテゴリの色定義は不要（CSS変数で管理）

// カテゴリタブの表示（色分け対応 - 6色）
function renderCategoryTabs() {
  if (!templateCategoryToggle) return;

  templateCategoryToggle.innerHTML = templateCategories.map((cat, index) => {
    const isActive = cat.id === currentTemplateCategory;
    const categoryClass = `category-${index}`;
    
    return `<button class="tab-button small ${categoryClass} ${isActive ? 'active' : ''}" 
      data-category="${cat.id}" 
      role="tab" 
      aria-selected="${isActive}">${escapeHtml(cat.name)}</button>`;
  }).join('');

  // イベントリスナー設定
  templateCategoryToggle.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-category');
      if (catId) {
        currentTemplateCategory = catId;
        renderCategoryTabs();
        renderTemplates();
      }
    });
  });
}

// カテゴリ管理リストの表示（モーダル内）
function renderCategoryManagement() {
  if (!categoryList) return;

  categoryList.innerHTML = templateCategories.map(cat => `
    <div class="category-tag" style="display: inline-flex; align-items: center; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
      <span>${escapeHtml(cat.name)}</span>
      ${['diagnoses', 'medications', 'phrases'].includes(cat.id) ? '' : `
        <button class="delete-cat-btn" data-id="${cat.id}" style="border: none; background: none; cursor: pointer; margin-left: 4px; color: #999;">&times;</button>
      `}
    </div>
  `).join('');

  // 削除ボタンのイベント
  categoryList.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      await deleteCategory(id);
    });
  });
}

// カテゴリ追加
async function addCategory() {
  const name = (newCategoryInput?.value || '').trim();
  if (!name) return;

  // ID生成 (簡易的)
  const id = 'cat_' + Date.now();

  templateCategories.push({ id, name });
  await StorageManager.saveTemplateCategories(templateCategories);

  newCategoryInput.value = '';
  renderCategoryTabs();
  renderCategoryManagement();

  // 管理画面のセレクトボックスも更新
  renderTemplateManageList();
}

// カテゴリ削除
async function deleteCategory(id) {
  if (!confirm('このカテゴリとカテゴリ内の定型文を削除しますか？')) return;

  templateCategories = templateCategories.filter(c => c.id !== id);

  // テンプレートデータからも削除（必須ではないがクリーンアップ）
  if (templates[id]) {
    delete templates[id];
  }

  await StorageManager.saveTemplateCategories(templateCategories);
  await StorageManager.saveTemplates(templates);

  // カレントカテゴリが削除された場合、先頭に戻す
  if (currentTemplateCategory === id) {
    currentTemplateCategory = templateCategories[0]?.id || 'diagnoses';
  }

  renderCategoryTabs();
  renderTemplates();
  renderCategoryManagement();
  renderTemplateManageList();
}

// 定型文 追加
async function addTemplate() {
  const cat = templateCategorySelect?.value || currentTemplateCategory;
  const val = (newTemplateInput?.value || '').trim();
  if (!val) return;

  // 配列が存在しない場合は初期化
  if (!templates[cat]) templates[cat] = [];

  const arr = templates[cat];
  arr.push(val);
  templates[cat] = arr;
  await StorageManager.saveTemplates(templates);
  newTemplateInput.value = '';
  renderTemplateManageList();
  if (cat === currentTemplateCategory) renderTemplates();
}

// 定型文の挿入（ハッシュタグは付けない）
function insertTemplate(text) {
  const currentText = textEditor.value;
  const cursorPos = textEditor.selectionStart ?? currentText.length;
  const textBefore = currentText.substring(0, cursorPos);
  const textAfter = currentText.substring(cursorPos);
  const sep = textBefore && !textBefore.endsWith('\n') && !textBefore.endsWith(' ') ? ' ' : '';
  textEditor.value = textBefore + sep + text + textAfter;
  textEditor.focus();
  const newPos = cursorPos + sep.length + text.length;
  textEditor.setSelectionRange(newPos, newPos);
  textEditor.setSelectionRange(newPos, newPos);
  saveData();
}

function renderTemplates() {
  const items = templates[currentTemplateCategory] || [];
  if (!templateList) return;
  if (!items.length) {
    templateList.innerHTML = '<p style="color: #999; font-size: 12px;">定型文がありません</p>';
    return;
  }
  
  // 6個に制限
  const displayItems = items.slice(0, 6);
  
  // カテゴリのインデックスを取得（色分け用）
  const categoryIndex = templateCategories.findIndex(cat => cat.id === currentTemplateCategory);
  const categoryClass = categoryIndex >= 0 ? `category-${categoryIndex}` : '';
  
  // 10文字以下の場合は省略表示
  const formatTemplateText = (text) => {
    if (text.length <= 10) {
      return text;
    }
    return text.substring(0, 10) + '...';
  };
  
  templateList.innerHTML = displayItems
    .map((t, i) => {
      const displayText = formatTemplateText(t);
      const fullText = t;
      return `<span class="template-tag ${categoryClass}" data-index="${i}" title="${escapeHtml(fullText)}">${escapeHtml(displayText)}</span>`;
    })
    .join('');
    
  templateList.querySelectorAll('.template-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const idx = parseInt(tag.getAttribute('data-index'));
      const text = (templates[currentTemplateCategory] || [])[idx] || '';
      if (!text) return;
      handleTemplateClick(text);
    });
  });
}

function handleTemplateClick(text) {
  if (!directTemplatePaste) {
    insertTemplate(text);
    return;
  }
  chrome.runtime.sendMessage({
    action: 'pasteToActiveTab',
    text,
    images: []
  }, (response) => {
    if (chrome.runtime.lastError) {
      showNotification('直接貼り付けに失敗しました: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success === false) {
      showNotification('直接貼り付けに失敗しました: ' + (response.error || '不明なエラー'));
    } else {
      showNotification('定型文を直接貼り付けました');
    }
  });
}

async function setupTemplateDirectPasteToggle() {
  try {
    directTemplatePaste = await StorageManager.getTemplatesDirectPaste();
  } catch (e) {
    directTemplatePaste = false;
  }
  if (directTemplatePasteToggle) {
    directTemplatePasteToggle.checked = directTemplatePaste;
    directTemplatePasteToggle.addEventListener('change', async (e) => {
      directTemplatePaste = e.target.checked;
      await StorageManager.saveTemplatesDirectPaste(directTemplatePaste);
      const status = directTemplatePaste ? 'ON' : 'OFF';
      showNotification(`定型文の直接貼り付けを${status}にしました`);
    });
  }
}

function renderTemplateManageList() {
  if (!templateManageList) return;

  // カテゴリセレクトボックスの更新
  if (templateCategorySelect) {
    const currentSelect = templateCategorySelect.value;
    templateCategorySelect.innerHTML = templateCategories.map(cat =>
      `<option value="${cat.id}" ${cat.id === (currentSelect || currentTemplateCategory) ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`
    ).join('');

    // 値が空または無効な場合は現在のカテゴリを選択
    if (!templateCategorySelect.value) {
      templateCategorySelect.value = currentTemplateCategory;
    }
  }

  const cat = templateCategorySelect?.value || currentTemplateCategory;
  const arr = templates[cat] || [];

  if (!arr.length) {
    templateManageList.innerHTML = '<p style="color: #999; text-align: center; padding: 16px;">定型文がありません</p>';
    return;
  }
  templateManageList.innerHTML = arr
    .map((t, i) => `
      <div class="template-manage-item" data-index="${i}">
        <span class="template-text">${escapeHtml(t)}</span>
        <div class="actions">
          <button class="btn btn-ghost" data-action="up" title="上へ">▲</button>
          <button class="btn btn-ghost" data-action="down" title="下へ">▼</button>
          <button class="btn btn-secondary" data-action="delete" title="削除">削除</button>
        </div>
      </div>
    `)
    .join('');
  templateManageList.querySelectorAll('.template-manage-item .btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const parent = btn.closest('.template-manage-item');
      const index = parseInt(parent.getAttribute('data-index'));
      const action = btn.getAttribute('data-action');
      const catNow = templateCategorySelect?.value || currentTemplateCategory;
      const arrNow = templates[catNow] || [];
      if (action === 'delete') {
        arrNow.splice(index, 1);
      } else if (action === 'up' && index > 0) {
        [arrNow[index - 1], arrNow[index]] = [arrNow[index], arrNow[index - 1]];
      } else if (action === 'down' && index < arrNow.length - 1) {
        [arrNow[index + 1], arrNow[index]] = [arrNow[index], arrNow[index + 1]];
      }
      templates[catNow] = arrNow;
      await StorageManager.saveTemplates(templates);
      renderTemplateManageList();
      if (catNow === currentTemplateCategory) renderTemplates();
    });
  });
}

// ページに貼り付ける
async function pasteToPage() {
  try {
    const text = textEditor.value;
    const images = currentImages;

    if (!text && images.length === 0) {
      showNotification('貼り付けるコンテンツがありません');
      return;
    }

    console.log('[SidePanel] 貼り付けリクエスト:', { text, imagesCount: images.length });

    // background.js経由でコンテンツスクリプトにメッセージを送る
    chrome.runtime.sendMessage({
      action: 'pasteToActiveTab',
      text: text,
      images: images
    }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SidePanel] メッセージ送信エラー:', chrome.runtime.lastError);
        showNotification('貼り付けに失敗しました: ' + chrome.runtime.lastError.message);
      } else if (response && response.success === false) {
        console.error('[SidePanel] 貼り付け失敗:', response);
        showNotification('貼り付けに失敗しました: ' + (response.error || '不明なエラー'));
        if (response.details) {
          console.error('[SidePanel] 詳細:', response.details);
        }
      } else {
        console.log('[SidePanel] 貼り付け成功:', response);
        if (retainTextAfterPaste) {
          showNotification('ページに貼り付けました（内容を保持しました）');
        } else {
          await clearAll({ skipConfirm: true, skipNotification: true });
          showNotification('ページに貼り付けました（テキストと画像をクリアしました）');
        }
      }
    });
  } catch (error) {
    console.error('貼り付けに失敗しました:', error);
    showNotification('貼り付けに失敗しました');
  }
}

// エディタのテキストをクリップボードにコピー
async function copyEditorText() {
  const text = textEditor.value || '';
  if (!text) {
    showNotification('コピーするテキストがありません');
    return;
  }
  chrome.runtime.sendMessage({ action: 'writeToClipboard', text }, (response) => {
    if (chrome.runtime.lastError) {
      showNotification('コピーに失敗しました: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      showNotification('テキストをコピーしました');
    } else {
      showNotification('コピーに失敗しました');
    }
  });
}

// テキストをクリア
async function clearText() {
  textEditor.value = '';
  await saveData();
  showNotification('テキストをクリアしました');
  textEditor.focus();
}

// Allクリア（テキストと画像の両方をクリア）
async function clearAll(options = {}) {
  const { skipConfirm = false, skipNotification = false } = options || {};

  if (!skipConfirm) {
    const confirmed = confirm('テキストと画像をすべてクリアしますか？');
    if (!confirmed) {
      return;
    }
  }

  textEditor.value = '';
  currentImages = [];
  await saveData();
  renderImages();

  if (!skipNotification) {
    showNotification('すべてクリアしました');
  }
}

// 通知を表示
function showNotification(message) {
  // 簡単な通知（後で改善可能）
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #1da1f2;
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}

// グローバル関数は不要になったが、念のため残しておく
window.removeImage = removeImage;

// AIチャット送信（プレースホルダー）
async function handleAiChatSend() {
  if (chatState.isSending) {
    return;
  }

  // 認証チェック
  if (window.AuthManager) {
    const token = await window.AuthManager.getToken();
    if (!token) {
      showNotification('ログインが必要です。Landing Pageでログインしてください。', 'error');
      // AIタブに切り替えて認証UIを表示
      const aiTab = document.querySelector('[data-tab-target="aiTab"]');
      if (aiTab) {
        aiTab.click();
      }
      await checkAuthAndUpdateUI();
      return;
    }
  }

  const message = aiChatInput?.value.trim();
  if (!message) {
    return;
  }

  if (!agentSelector) {
    showNotification('エージェント選択UIが初期化されていません');
    return;
  }

  if (!agentSelector.value) {
    showNotification('先にエージェントを選択してください');
    return;
  }

  const selectedAgent = aiState.agents.find((agent) => agent.id === agentSelector.value);
  if (!selectedAgent) {
    showNotification('選択したエージェントが見つかりません');
    return;
  }



  ensureChatSession(selectedAgent);

  const now = new Date().toISOString();
  const userMessage = {
    id: generateId('msg'),
    role: 'user',
    content: message,
    createdAt: now,
    status: 'delivered'
  };

  chatState.messages.push(userMessage);
  chatState.updatedAt = now;
  renderChatMessages();

  if (aiChatInput) {
    aiChatInput.value = '';
  }

  const assistantMessage = {
    id: generateId('msg'),
    role: 'assistant',
    content: '',
    createdAt: now,
    status: 'pending'
  };

  chatState.messages.push(assistantMessage);
  renderChatMessages();

  chatState.isSending = true;
  setSendButtonState(true);

  try {
    // Check if ApiClient is available
    if (typeof window.ApiClient === 'undefined' || typeof window.ApiClient.chat !== 'function') {
      throw new Error('ApiClient が正しく初期化されていません。ページをリロードしてください。');
    }

    const system = selectedAgent.instructions || '';
    const messages = buildConversationPayload();

    // Use ApiClient to call Azure Function
    const response = await window.ApiClient.chat(messages, system);

    // Debug log
    console.log('[SidePanel] AI Response:', response);

    if (!response) {
      throw new Error('AIからの応答が空です');
    }

    let replyText = '';
    if (typeof response.content === 'string') {
      replyText = response.content;
    } else if (Array.isArray(response.content) && response.content[0] && response.content[0].text) {
      replyText = response.content[0].text;
    } else if (response.content === null || response.content === undefined) {
      // Allow null/undefined if we want to handle it gracefully, or throw specific error
      console.warn('[SidePanel] Content is null/undefined');
      throw new Error('AIからの応答にコンテンツが含まれていません');
    } else {
      console.error('[SidePanel] Unknown response format:', response);
      throw new Error('AIからの応答形式が不明です');
    }

    assistantMessage.content = replyText;
    assistantMessage.status = 'delivered';
    chatState.updatedAt = new Date().toISOString();
    renderChatMessages();
    await persistChatSession();

    // Save log
    try {
      await window.ApiClient.saveLog(
        'ai_chat',
        {
          agentId: selectedAgent.id,
          // model: managed by backend
          inputLength: message.length,
          outputLength: replyText.length
        },
        'user' // TODO: Use actual user ID if available
      );
    } catch (logError) {
      console.error('[SidePanel] ログ保存エラー:', logError);
    }

  } catch (error) {
    console.error('[SidePanel] AIチャット送信エラー:', error);
    assistantMessage.content = `エラー: ${error.message}`;
    assistantMessage.status = 'failed';
    chatState.updatedAt = new Date().toISOString();
    renderChatMessages();
    await persistChatSession();
    showNotification('AIチャットの送信に失敗しました');
  } finally {
    chatState.isSending = false;
    setSendButtonState(false);
  }
}

// シンプルなHTMLエスケープ
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMessageText(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function getDefaultAgents() {
  if (window.AiAgentUtils) {
    return window.AiAgentUtils.getDefaultAgents();
  }
  return [
    {
      id: 'soap',
      label: 'SOAP Formatter',
      name: 'SOAP形式整理エージェント',
      description: '医療情報をSOAP形式（Subjective, Objective, Assessment, Plan）で整理します。',
      instructions:
        '提供された情報をSOAP形式で整理してください。\n\n' +
        '【S (Subjective) - 主観的所見】\n' +
        '患者の訴え、症状、病歴、家族歴など、患者や家族から得られた主観的な情報を記載してください。\n\n' +
        '【O (Objective) - 客観的所見】\n' +
        '身体所見、検査結果、バイタルサイン、画像所見など、客観的に観察・測定された情報を記載してください。\n\n' +
        '【A (Assessment) - 評価】\n' +
        'SとOの情報を統合し、診断や病態の評価、鑑別診断を記載してください。\n\n' +
        '【P (Plan) - 計画】\n' +
        '今後の治療計画、検査計画、投薬計画、患者への説明事項、フォローアップ計画を記載してください。\n\n' +
        '医療用語は適切に使用し、簡潔で読みやすい形式で出力してください。',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'referral',
      label: 'Referral Letter Writer',
      name: '紹介状作成エージェント',
      description: '適切な形式で紹介状を作成します。',
      instructions:
        '提供された情報を基に、適切な形式の紹介状を作成してください。\n\n' +
        '【記載すべき項目】\n' +
        '1. 宛先（医療機関名・診療科名・医師名）\n' +
        '2. 患者情報（氏名、年齢、性別、生年月日）\n' +
        '3. 紹介の目的・理由\n' +
        '4. 現病歴・主訴\n' +
        '5. 現在までの経過・治療内容\n' +
        '6. 検査結果・所見（関連するもの）\n' +
        '7. 現在の診断・病名\n' +
        '8. 依頼事項（専門的な診察、検査、治療など）\n' +
        '9. 返信の希望（診療情報提供書の返送希望など）\n' +
        '10. 紹介元の医療機関情報（名称、住所、電話番号、医師名、診療科）\n\n' +
        '【作成時の注意点】\n' +
        '- 丁寧で専門的な表現を使用してください\n' +
        '- 必要な情報を漏れなく記載してください\n' +
        '- 読みやすく、論理的な構成にしてください\n' +
        '- 医療用語は適切に使用してください\n' +
        '- 患者のプライバシーに配慮してください',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'email',
      label: 'Email Reply Assistant',
      name: 'メール返信エージェント',
      description: '一般的なメール返信を適切な形式で作成します。',
      instructions:
        '提供されたメール内容を確認し、適切な形式で返信メールを作成してください。\n\n' +
        '【返信メールの構成】\n' +
        '1. 適切な件名（Re: を付けるか、内容に応じた件名）\n' +
        '2. 挨拶、相手の名前や所属を明記する（適切な敬語を使用）\n' +
        '3. 受信への感謝や確認\n' +
        '4. 返信内容（質問への回答、依頼への対応、情報提供など）\n' +
        '5. 今後のアクションや連絡事項（必要に応じて）\n' +
        '6. 結びの挨拶\n' +
        '7. 署名（必要に応じて）\n\n' +
        '【作成時の注意点】\n' +
        '- 相手の意図を正確に理解し、適切に応答してください\n' +
        '- 礼儀正しく、丁寧な表現を使用してください\n' +
        '- 簡潔で分かりやすい文章にしてください\n' +
        '- 重要な情報は明確に伝えてください\n' +
        '- 必要に応じて箇条書きを使用してください\n' +
        '- 誤解を招く表現は避けてください\n' +
        '- 返信が遅れた場合は、その旨を簡潔に謝罪してください',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'clinical-support',
      label: 'Clinical Support',
      name: '診療支援エージェント',
      description: '患者の診療内容について相談できるエージェントです。',
      instructions:
        '提供された患者情報や診療内容について、医学的な観点から分析・助言を行ってください。\n\n' +
        '【対応内容】\n' +
        '- 鑑別診断の提案\n' +
        '- 追加で必要な検査の提案\n' +
        '- 治療方針の検討\n' +
        '- 薬剤選択の助言\n' +
        '- 専門医への紹介タイミングの判断\n' +
        '- ガイドラインに基づく推奨事項\n\n' +
        '【回答時の注意点】\n' +
        '- エビデンスに基づいた情報を提供してください\n' +
        '- 複数の選択肢がある場合は、それぞれのメリット・デメリットを示してください\n' +
        '- 緊急性や重症度の評価を含めてください\n' +
        '- 必要に応じて最新のガイドラインを参照してください\n' +
        '- 診断や治療の最終判断は医師が行うことを前提としてください\n' +
        '- 簡潔で実践的なアドバイスを心がけてください',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

function normalizeAgents(agents, defaults) {
  const defaultsMap = new Map(defaults.map((agent) => [agent.id, agent]));
  const now = new Date().toISOString();
  if (!Array.isArray(agents)) return defaults.map((agent) => ({ ...agent }));

  return agents.map((agent, index) => {
    const safeId = agent?.id || `agent-${index}`;
    const fallback = defaultsMap.get(safeId) || {};
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

function resolveSelectedAgentId(agents, storedId) {
  if (!Array.isArray(agents) || agents.length === 0) {
    return '';
  }

  if (storedId && agents.some((agent) => agent.id === storedId)) {
    return storedId;
  }

  return agents[0].id;
}

function renderAgentSelector() {
  if (!agentSelector) return;

  const hasAgents = Array.isArray(aiState.agents) && aiState.agents.length > 0;
  const placeholderOption = `<option value="" ${hasAgents ? '' : 'selected'}>${hasAgents ? 'エージェントを選択...' : 'エージェントがありません'}</option>`;

  const optionsHtml = hasAgents
    ? aiState.agents
      .map((agent) => {
        const selected = agent.id === aiState.selectedAgentId ? 'selected' : '';
        return `<option value="${agent.id}" ${selected}>${escapeHtml(agent.name || agent.label)}</option>`;
      })
      .join('')
    : '';

  isAgentSelectionUpdateSilent = true;
  agentSelector.innerHTML = placeholderOption + optionsHtml;
  agentSelector.disabled = !hasAgents;
  agentSelector.value = hasAgents ? aiState.selectedAgentId || '' : '';
  isAgentSelectionUpdateSilent = false;
}

function setupStorageObservers() {
  if (!chrome?.storage?.onChanged) return;

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[StorageManager.STORAGE_KEYS.AI_AGENTS]) {
      const defaults = getDefaultAgents();
      aiState.agents = normalizeAgents(changes[StorageManager.STORAGE_KEYS.AI_AGENTS].newValue, defaults);
      aiState.selectedAgentId = resolveSelectedAgentId(aiState.agents, aiState.selectedAgentId);
      renderAgentSelector();
      showNotification('エージェント設定を更新しました');
    }

    if (changes[StorageManager.STORAGE_KEYS.AI_SELECTED_AGENT_ID]) {
      aiState.selectedAgentId = changes[StorageManager.STORAGE_KEYS.AI_SELECTED_AGENT_ID].newValue || '';
      renderAgentSelector();
      loadChatHistory();
    }



    if (changes[StorageManager.STORAGE_KEYS.AI_CHAT_SESSIONS]) {
      loadChatHistory();
    }
  });
}

async function handleAgentSelectorChange(event) {
  const selectedValue = event.target.value;

  if (isAgentSelectionUpdateSilent) {
    return;
  }

  aiState.selectedAgentId = selectedValue;
  await StorageManager.saveSelectedAgentId(selectedValue);
  await loadChatHistory();

  if (!selectedValue) {
    showNotification('エージェントを選択してください');
    return;
  }

  const selectedAgent = aiState.agents.find((agent) => agent.id === selectedValue);
  if (selectedAgent) {
    showNotification(`「${escapeHtml(selectedAgent.name || selectedAgent.label)}」と会話を開始します`);
  }
}

const chatState = {
  sessionId: '',
  agentId: '',
  agentName: '',
  messages: [],
  createdAt: '',
  updatedAt: '',
  isSending: false
};

let chatSessionsCache = [];
let isPersistingChatSession = false;

async function loadChatHistory() {
  // persistChatSession実行中は再読み込みをスキップ
  if (isPersistingChatSession) {
    return;
  }

  try {
    chatSessionsCache = await StorageManager.getChatSessions();
    const activeSession = selectSessionForAgent(chatSessionsCache, aiState.selectedAgentId);
    if (activeSession) {
      applySessionToState(activeSession);
    } else {
      resetChatState();
    }
    renderChatMessages();
  } catch (error) {
    console.error('[SidePanel] チャット履歴の読み込みに失敗しました', error);
    showNotification('チャット履歴の読み込みに失敗しました');
  }
}

function selectSessionForAgent(sessions, agentId) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return null;
  }

  const targetSessions = agentId ? sessions.filter((session) => session.agentId === agentId) : sessions;
  if (targetSessions.length === 0) {
    return null;
  }

  return [...targetSessions].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  })[0];
}

function applySessionToState(session) {
  chatState.sessionId = session.id;
  chatState.agentId = session.agentId;
  chatState.agentName = session.agentName || '';
  chatState.createdAt = session.createdAt || '';
  chatState.updatedAt = session.updatedAt || session.createdAt || '';
  chatState.messages = Array.isArray(session.messages)
    ? session.messages.map((message) => ({
      id: message.id || generateId('msg'),
      role: message.role,
      content: message.content,
      createdAt: message.createdAt || session.createdAt || '',
      status: 'delivered'
    }))
    : [];
}

function resetChatState() {
  chatState.sessionId = '';
  chatState.agentId = aiState.selectedAgentId || '';
  const agent = aiState.agents.find((item) => item.id === chatState.agentId);
  chatState.agentName = agent ? agent.name || agent.label || '' : '';
  chatState.messages = [];
  chatState.createdAt = '';
  chatState.updatedAt = '';
  chatState.isSending = false;
}

function ensureChatSession(agent) {
  if (chatState.sessionId && chatState.agentId === agent.id) {
    return;
  }

  chatState.sessionId = generateId('session');
  chatState.agentId = agent.id;
  chatState.agentName = agent.name || agent.label || '';
  const now = new Date().toISOString();
  chatState.createdAt = now;
  chatState.updatedAt = now;
  chatState.messages = [];
}

function renderChatMessages() {
  if (!aiChatMessages) return;

  if (!chatState.messages.length) {
    aiChatMessages.innerHTML =
      '<div class="ai-chat-empty">エージェントを選択してメッセージを送信すると会話が表示されます。</div>';
    return;
  }

  aiChatMessages.innerHTML = chatState.messages
    .map((message) => {
      const roleClass = message.role === 'user' ? 'ai-message-user' : 'ai-message-assistant';
      const pendingClass = message.status === 'pending' ? ' ai-message-pending' : '';
      const failedClass = message.status === 'failed' ? ' ai-message-error' : '';
      const nameLabel =
        message.role === 'user' ? 'あなた' : escapeHtml(chatState.agentName || 'アシスタント');
      const body =
        message.status === 'pending'
          ? '<span class="ai-message-loading">思考中…</span>'
          : `<span>${formatMessageText(message.content || '')}</span>`;

      return `
        <div class="ai-message ${roleClass}${pendingClass}${failedClass}">
          <strong>${nameLabel}</strong>
          ${body}
        </div>
      `;
    })
    .join('');

  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function setSendButtonState(isDisabled) {
  if (aiChatSendBtn) {
    aiChatSendBtn.disabled = isDisabled;
    aiChatSendBtn.textContent = isDisabled ? '送信中…' : '送信';
  }
}

async function persistChatSession() {
  if (!chatState.sessionId || !chatState.agentId) {
    return;
  }

  isPersistingChatSession = true;

  try {
    const persistedMessages = chatState.messages
      .filter((message) => message.status !== 'pending')
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt
      }));

    const sessionPayload = {
      id: chatState.sessionId,
      agentId: chatState.agentId,
      agentName: chatState.agentName,
      createdAt: chatState.createdAt || new Date().toISOString(),
      updatedAt: chatState.updatedAt || new Date().toISOString(),
      messages: persistedMessages
    };

    const nextSessions = Array.isArray(chatSessionsCache) ? [...chatSessionsCache] : [];
    const sessionIndex = nextSessions.findIndex((session) => session.id === sessionPayload.id);
    if (sessionIndex >= 0) {
      nextSessions[sessionIndex] = sessionPayload;
    } else {
      nextSessions.push(sessionPayload);
    }

    await StorageManager.saveChatSessions(nextSessions);
    chatSessionsCache = await StorageManager.getChatSessions();
  } finally {
    isPersistingChatSession = false;
  }
}

function buildConversationPayload() {
  return chatState.messages
    .filter((message) => message.role === 'user' || (message.role === 'assistant' && message.status !== 'pending'))
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

async function sendLatestAssistantMessageToEditor() {
  const latestAssistant = [...chatState.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.status === 'delivered' && message.content);

  if (!latestAssistant) {
    showNotification('反映できるAI応答がありません');
    return;
  }

  // 既存のテキストを上書き（追加ではなく置き換え）
  textEditor.value = latestAssistant.content;
  await saveData();
  textEditor.focus();
  showNotification('最新のAI応答をテキストに反映しました');

  // 自動的にテキスト編集タブに切り替え
  switchToTextTab();
}

async function pasteLatestAssistantMessageDirect() {
  const latestAssistant = [...chatState.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.status === 'delivered' && message.content);

  if (!latestAssistant) {
    showNotification('直接貼り付け可能なAI応答がありません');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'pasteToActiveTab',
    text: latestAssistant.content,
    images: []
  }, (response) => {
    if (chrome.runtime.lastError) {
      showNotification('直接貼り付けに失敗しました: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success === false) {
      showNotification('直接貼り付けに失敗しました: ' + (response.error || '不明なエラー'));
    } else {
      showNotification('AI応答を直接貼り付けました');
    }
  });
}

async function copyLatestAssistantMessage() {
  const latestAssistant = [...chatState.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.status === 'delivered' && message.content);

  if (!latestAssistant) {
    showNotification('コピーできるAI応答がありません');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'writeToClipboard',
    text: latestAssistant.content
  }, (response) => {
    if (chrome.runtime.lastError) {
      showNotification('コピーに失敗しました: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      showNotification('AI応答をコピーしました');
    } else {
      showNotification('コピーに失敗しました');
    }
  });
}

async function clearCurrentChatSession() {
  if (!chatState.sessionId) {
    resetChatState();
    renderChatMessages();
    return;
  }

  chatSessionsCache = Array.isArray(chatSessionsCache)
    ? chatSessionsCache.filter((session) => session.id !== chatState.sessionId)
    : [];

  await StorageManager.saveChatSessions(chatSessionsCache);
  resetChatState();
  renderChatMessages();
}

// 日本時間表示機能
function getJstTimeString() {
  const now = new Date();
  const jstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const year = jstTime.getFullYear();
  const month = String(jstTime.getMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getDate()).padStart(2, '0');
  const hours = String(jstTime.getHours()).padStart(2, '0');
  const minutes = String(jstTime.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function updateJstTimeDisplay() {
  const jstTimeDisplay = document.getElementById('jstTimeDisplay');
  if (jstTimeDisplay) {
    jstTimeDisplay.textContent = getJstTimeString();
  }
}

function setupJstTimeDisplay() {
  // 初回表示
  updateJstTimeDisplay();
  
  // 1秒ごとに更新
  setInterval(() => {
    updateJstTimeDisplay();
  }, 1000);
}

// Debug: Check if ApiClient is loaded
console.log('[DEBUG] ApiClient loaded:', window.ApiClient);
if (!window.ApiClient) {
  console.error('[ERROR] ApiClient is not loaded! Check api.js');
}

// 初期化実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
