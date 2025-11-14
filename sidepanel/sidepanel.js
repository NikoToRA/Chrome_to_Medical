/**
 * サイドパネルのメインロジック
 */

// DOM要素の取得
const textEditor = document.getElementById('textEditor');
const charCount = document.getElementById('charCount');
const addImageBtn = document.getElementById('addImageBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const imageCount = document.getElementById('imageCount');
const hashtagList = document.getElementById('hashtagList');
const manageHashtagsBtn = document.getElementById('manageHashtagsBtn');
const clearTextBtn = document.getElementById('clearTextBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const pasteToPageBtn = document.getElementById('pasteToPageBtn');
const captureScreenshotBtn = document.getElementById('captureScreenshotBtn');
const captureSelectScreenshotBtn = document.getElementById('captureSelectScreenshotBtn');
const hashtagModal = document.getElementById('hashtagModal');
const closeHashtagModal = document.getElementById('closeHashtagModal');
const newHashtagInput = document.getElementById('newHashtagInput');
const addHashtagBtn = document.getElementById('addHashtagBtn');
const hashtagManageList = document.getElementById('hashtagManageList');
const platformIndicator = document.getElementById('platformIndicator');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-content[role="tabpanel"]');
const sendAiToTextBtn = document.getElementById('sendAiToTextBtn');
const agentSelector = document.getElementById('agentSelector');
const aiChatMessages = document.getElementById('aiChatMessages');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSendBtn = document.getElementById('aiChatSendBtn');
const aiChatForm = document.getElementById('aiChatForm');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const retainTextToggle = document.getElementById('retainTextToggle');
const clearChatBtn = document.getElementById('clearChatBtn');
// 状態管理
let currentImages = [];
let hashtags = [];
let currentPlatform = null;
const SUPPORTED_MODELS = ['claude-sonnet-4-5', 'claude-haiku-4-5'];
const DEFAULT_MODEL = SUPPORTED_MODELS[0];

const aiState = {
  apiKey: '',
  agents: [],
  selectedAgentId: '',
  selectedModel: DEFAULT_MODEL
};
let isAgentSelectionUpdateSilent = false;

// テキスト保持設定
let retainTextAfterPaste = false;

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
  updateCharCount();
  renderHashtags();
  renderImages();
}

// プラットフォーム検出
async function detectPlatform() {
  try {
    chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
      if (response && response.tab) {
        const platform = PlatformDetector.detectFromURL(response.tab.url);
        currentPlatform = platform;
        updatePlatformIndicator(platform);
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
function updatePlatformIndicator(platform) {
  if (platform) {
    const platformName = PlatformDetector.getPlatformName(platform);
    platformIndicator.textContent = `📱 ${platformName}`;
    platformIndicator.style.display = 'block';
  } else {
    platformIndicator.style.display = 'none';
  }
}

// エディタ用データの読み込み
async function loadEditorState() {
  const text = await StorageManager.getText();
  const images = await StorageManager.getImages();
  const savedHashtags = await StorageManager.getHashtags();

  textEditor.value = text;
  currentImages = images || [];
  hashtags = savedHashtags || [];
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
    const defaults = getDefaultAgents();
    const [storedAgents, storedSelectedId, apiKey, storedModel] = await Promise.all([
      StorageManager.getAgents(defaults),
      StorageManager.getSelectedAgentId(),
      StorageManager.getApiKey(),
      StorageManager.getSelectedModel('claude-4.5-sonnet')
    ]);

    aiState.apiKey = apiKey || '';
    aiState.agents = normalizeAgents(storedAgents, defaults);
    aiState.selectedAgentId = resolveSelectedAgentId(aiState.agents, storedSelectedId);
    const resolvedModel = SUPPORTED_MODELS.includes(storedModel) ? storedModel : DEFAULT_MODEL;
    aiState.selectedModel = resolvedModel;

    if (aiState.selectedAgentId !== storedSelectedId) {
      await StorageManager.saveSelectedAgentId(aiState.selectedAgentId);
    }

    if (!SUPPORTED_MODELS.includes(storedModel)) {
      await StorageManager.saveSelectedModel(resolvedModel);
    }

    renderAgentSelector();
    await loadChatHistory();
  } catch (error) {
    console.error('[SidePanel] AI設定の読み込みに失敗しました', error);
    showNotification('AI設定の読み込みに失敗しました');
  }
}

// データの保存
async function saveData() {
  await StorageManager.saveText(textEditor.value);
  await StorageManager.saveImages(currentImages);
  await StorageManager.saveHashtags(hashtags);
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
    updateCharCount();
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

  // ハッシュタグ管理
  manageHashtagsBtn.addEventListener('click', () => {
    hashtagModal.classList.add('active');
    renderHashtagManageList();
  });

  closeHashtagModal.addEventListener('click', () => {
    hashtagModal.classList.remove('active');
  });

  hashtagModal.addEventListener('click', (e) => {
    if (e.target === hashtagModal) {
      hashtagModal.classList.remove('active');
    }
  });

  addHashtagBtn.addEventListener('click', () => {
    addHashtag();
  });

  newHashtagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addHashtag();
    }
  });

  clearTextBtn.addEventListener('click', async () => {
    await clearText();
  });

  // Allクリア機能
  clearAllBtn.addEventListener('click', async () => {
    await clearAll();
  });

  // ページに貼り付ける機能
  pasteToPageBtn.addEventListener('click', async () => {
    await pasteToPage();
  });

  if (sendAiToTextBtn) {
    sendAiToTextBtn.addEventListener('click', async () => {
      await sendLatestAssistantMessageToEditor();
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

// 文字数カウントの更新
function updateCharCount() {
  const count = textEditor.value.length;
  charCount.textContent = `${count}文字`;
  
  if (count > 140) {
    charCount.classList.add('warning');
  } else {
    charCount.classList.remove('warning');
  }
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

// ハッシュタグの追加
async function addHashtag() {
  const hashtag = newHashtagInput.value.trim();
  
  if (!hashtag) {
    return;
  }

  // #がついていない場合は追加
  const formattedHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
  
  if (!hashtags.includes(formattedHashtag)) {
    hashtags.push(formattedHashtag);
    await saveData();
    renderHashtags();
    renderHashtagManageList();
    newHashtagInput.value = '';
  }
}

// ハッシュタグの削除
async function deleteHashtag(hashtag) {
  hashtags = hashtags.filter(h => h !== hashtag);
  await saveData();
  renderHashtags();
  renderHashtagManageList();
}

// ハッシュタグの挿入
function insertHashtag(hashtag) {
  const currentText = textEditor.value;
  
  // 既に同じハッシュタグがテキストに含まれているかチェック
  // ハッシュタグは通常、単語の境界で区切られているため、完全一致でチェック
  const hashtagRegex = new RegExp(`\\b${hashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  if (hashtagRegex.test(currentText)) {
    console.log('[SidePanel] ハッシュタグは既にテキストに含まれています:', hashtag);
    showNotification(`ハッシュタグ「${hashtag}」は既にテキストに含まれています`);
    return;
  }
  
  const cursorPos = textEditor.selectionStart;
  const textBefore = currentText.substring(0, cursorPos);
  const textAfter = currentText.substring(cursorPos);
  const space = textBefore && !textBefore.endsWith(' ') ? ' ' : '';
  
  textEditor.value = textBefore + space + hashtag + ' ' + textAfter;
  textEditor.focus();
  textEditor.setSelectionRange(
    cursorPos + space.length + hashtag.length + 1,
    cursorPos + space.length + hashtag.length + 1
  );
  
  updateCharCount();
  saveData();
}

// ハッシュタグの表示
function renderHashtags() {
  if (hashtags.length === 0) {
    hashtagList.innerHTML = '<p style="color: #999; font-size: 12px;">ハッシュタグがありません</p>';
    return;
  }

  hashtagList.innerHTML = hashtags.map((hashtag, index) => `
    <span class="hashtag-tag" data-hashtag-index="${index}">${hashtag}</span>
  `).join('');

  // イベントリスナーを追加
  hashtagList.querySelectorAll('.hashtag-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const index = parseInt(tag.getAttribute('data-hashtag-index'));
      insertHashtag(hashtags[index]);
    });
  });
}

// ハッシュタグ管理リストの表示
function renderHashtagManageList() {
  if (hashtags.length === 0) {
    hashtagManageList.innerHTML = '<p style="color: #999; text-align: center; padding: 16px;">ハッシュタグがありません</p>';
    return;
  }

  hashtagManageList.innerHTML = hashtags.map((hashtag, index) => `
    <div class="hashtag-manage-item">
      <span class="hashtag-text">${hashtag}</span>
      <button class="delete-btn" data-hashtag-index="${index}">削除</button>
    </div>
  `).join('');

  // 削除ボタンのイベントリスナーを追加
  hashtagManageList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-hashtag-index'));
      deleteHashtag(hashtags[index]);
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

// テキストをクリア
async function clearText() {
  textEditor.value = '';
  updateCharCount();
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
  updateCharCount();
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
window.insertHashtag = insertHashtag;
window.deleteHashtag = deleteHashtag;

// AIチャット送信（プレースホルダー）
function handleAiChatSend() {
  if (chatState.isSending) {
    return;
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

  if (!aiState.apiKey) {
    showNotification('Claude APIキーを設定してください');
    return;
  }

  const selectedModel = SUPPORTED_MODELS.includes(aiState.selectedModel) ? aiState.selectedModel : DEFAULT_MODEL;

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

  const payload = {
    sessionId: chatState.sessionId,
    agentId: selectedAgent.id,
    agentName: selectedAgent.name || selectedAgent.label || '',
    instructions: selectedAgent.instructions || '',
    model: selectedModel,
    messages: buildConversationPayload()
  };

  chrome.runtime.sendMessage(
    {
      action: 'claudeChat',
      payload
    },
    async (response) => {
      chatState.isSending = false;
      setSendButtonState(false);

      if (chrome.runtime.lastError) {
        console.error('[SidePanel] AIチャット送信エラー:', chrome.runtime.lastError);
        assistantMessage.content = `エラー: ${chrome.runtime.lastError.message}`;
        assistantMessage.status = 'failed';
        chatState.updatedAt = new Date().toISOString();
        renderChatMessages();
        await persistChatSession();
        showNotification('AIチャットの送信に失敗しました');
        return;
      }

      if (!response || response.success === false) {
        const errorMessage = response?.error || 'AI応答の取得に失敗しました';
        assistantMessage.content = errorMessage;
        assistantMessage.status = 'failed';
        chatState.updatedAt = new Date().toISOString();
        renderChatMessages();
        await persistChatSession();
        showNotification(errorMessage);
        return;
      }

      assistantMessage.content = response.message || '';
      assistantMessage.status = 'delivered';
      chatState.updatedAt = new Date().toISOString();
      renderChatMessages();
      await persistChatSession();
    }
  );
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
      id: 'buzz',
      label: 'Buzz Booster',
      name: 'バズ投稿エージェント',
      description: 'SNSで話題を生むテンション高めの投稿を生成します。',
      instructions:
        '最新のトレンドやエモーショナルなフレーズを織り交ぜ、ユーザーの共感を誘う構成でテキストを組み立ててください。140文字以内を推奨。',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'reply',
      label: 'Reply Concierge',
      name: '返信サポートエージェント',
      description: '丁寧かつ簡潔な返信メッセージを提案します。',
      instructions:
        '相手の意図を汲み取り、礼儀正しく、次のアクションが明確になる文章を提案してください。語尾は柔らかく。',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'editor',
      label: 'Rewrite Master',
      name: '文章リライトエージェント',
      description: '既存の文章を読みやすくリライトします。',
      instructions:
        '元のニュアンスを保ちながら、構成・語彙を整え、プロフェッショナルで信頼できる印象の文章に書き換えてください。',
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

    if (changes[StorageManager.STORAGE_KEYS.AI_SELECTED_MODEL]) {
      const rawModel = changes[StorageManager.STORAGE_KEYS.AI_SELECTED_MODEL].newValue || DEFAULT_MODEL;
      const resolvedModel = SUPPORTED_MODELS.includes(rawModel) ? rawModel : DEFAULT_MODEL;
      aiState.selectedModel = resolvedModel;
      showNotification('モデル設定を更新しました');
      if (!SUPPORTED_MODELS.includes(rawModel)) {
        StorageManager.saveSelectedModel(resolvedModel);
      }
    }

    if (changes[StorageManager.STORAGE_KEYS.CLAUDE_API_KEY]) {
      aiState.apiKey = changes[StorageManager.STORAGE_KEYS.CLAUDE_API_KEY].newValue || '';
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
  updateCharCount();
  await saveData();
  textEditor.focus();
  showNotification('最新のAI応答をテキストに反映しました');

  // 自動的にテキスト編集タブに切り替え
  switchToTextTab();
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
// 初期化実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
