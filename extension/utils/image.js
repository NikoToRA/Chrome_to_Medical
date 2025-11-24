/**
 * 画像処理ユーティリティ
 */
class ImageManager {
  /**
   * ファイルをBase64に変換
   * @param {File} file - 画像ファイル
   * @returns {Promise<string>}
   */
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Base64からBlob URLを作成
   * @param {string} base64 - Base64文字列
   * @returns {string} Blob URL
   */
  static base64ToBlobURL(base64) {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    return URL.createObjectURL(blob);
  }

  /**
   * 画像ファイルを検証
   * @param {File} file - 画像ファイル
   * @returns {boolean}
   */
  static validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  }

  /**
   * 画像のサイズを取得
   * @param {string} imageSrc - 画像のソース（Base64またはURL）
   * @returns {Promise<{width: number, height: number}>}
   */
  static getImageSize(imageSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  }

  /**
   * 画像をクリップボードにコピー
   * @param {string} imageSrc - 画像のソース（Base64またはURL）
   * @returns {Promise<void>}
   */
  static async copyImageToClipboard(imageSrc) {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
    } catch (error) {
      console.error('画像のコピーに失敗しました:', error);
      throw error;
    }
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.ImageManager = ImageManager;
}
