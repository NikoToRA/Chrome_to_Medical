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
const copyTextBtn = document.getElementById('copyTextBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const pasteToPageBtn = document.getElementById('pasteToPageBtn');
const hashtagModal = document.getElementById('hashtagModal');
const closeHashtagModal = document.getElementById('closeHashtagModal');
const newHashtagInput = document.getElementById('newHashtagInput');
const addHashtagBtn = document.getElementById('addHashtagBtn');
const hashtagManageList = document.getElementById('hashtagManageList');
const platformIndicator = document.getElementById('platformIndicator');

// 状態管理
let currentImages = [];
let hashtags = [];
let currentPlatform = null;

// 初期化
async function init() {
  await loadData();
  await detectPlatform();
  setupEventListeners();
  setupPlatformDetection();
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

// データの読み込み
async function loadData() {
  const text = await StorageManager.getText();
  const images = await StorageManager.getImages();
  const savedHashtags = await StorageManager.getHashtags();
  
  textEditor.value = text;
  currentImages = images || [];
  hashtags = savedHashtags || [];
}

// データの保存
async function saveData() {
  await StorageManager.saveText(textEditor.value);
  await StorageManager.saveImages(currentImages);
  await StorageManager.saveHashtags(hashtags);
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

  // コピー機能
  copyTextBtn.addEventListener('click', async () => {
    await copyText();
  });

  copyAllBtn.addEventListener('click', async () => {
    await copyAll();
  });

  // ページに貼り付ける機能
  pasteToPageBtn.addEventListener('click', async () => {
    await pasteToPage();
  });
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
    <div class="image-item">
      <img src="${img.base64}" alt="${img.name}">
      <button class="remove-btn" data-image-id="${img.id}">&times;</button>
    </div>
  `).join('');

  // 削除ボタンのイベントリスナーを追加
  imagePreview.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const imageId = parseFloat(btn.getAttribute('data-image-id'));
      removeImage(imageId);
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
  const cursorPos = textEditor.selectionStart;
  const textBefore = textEditor.value.substring(0, cursorPos);
  const textAfter = textEditor.value.substring(cursorPos);
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

// テキストをコピー
async function copyText() {
  try {
    await navigator.clipboard.writeText(textEditor.value);
    showNotification('テキストをコピーしました');
  } catch (error) {
    console.error('コピーに失敗しました:', error);
    alert('コピーに失敗しました。');
  }
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
    }, (response) => {
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
        showNotification('ページに貼り付けました');
      }
    });
  } catch (error) {
    console.error('貼り付けに失敗しました:', error);
    showNotification('貼り付けに失敗しました');
  }
}

// すべてをコピー（テキスト + 画像情報）
async function copyAll() {
  try {
    let text = textEditor.value;
    
    if (currentImages.length > 0) {
      text += `\n\n[画像 ${currentImages.length}枚]`;
    }
    
    await navigator.clipboard.writeText(text);
    showNotification('すべてをコピーしました');
  } catch (error) {
    console.error('コピーに失敗しました:', error);
    alert('コピーに失敗しました。');
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

// 初期化実行
init();
