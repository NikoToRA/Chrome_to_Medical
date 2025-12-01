#!/bin/bash
# Chrome Web Store 拡張機能更新スクリプト

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "❌ エラー: バージョン番号を指定してください"
  echo "使用方法: ./update-extension.sh 0.1.1"
  exit 1
fi

# バージョン番号の形式チェック（簡易版）
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ エラー: バージョン番号の形式が正しくありません（例: 0.1.1）"
  exit 1
fi

echo "🔄 拡張機能をバージョン $VERSION に更新します..."

# manifest.jsonのバージョンを更新
if [ -f "extensions/manifest.json" ]; then
  # macOS用のsedコマンド
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" extensions/manifest.json
  else
    sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" extensions/manifest.json
  fi
  echo "✅ manifest.json のバージョンを $VERSION に更新しました"
else
  echo "❌ エラー: extensions/manifest.json が見つかりません"
  exit 1
fi

# ZIPファイルを作成
ZIP_FILE="karte-ai-plus-v${VERSION}.zip"
cd extensions
zip -r "../${ZIP_FILE}" . -x "*.DS_Store" "*.git*" "*.md" "*.sh" > /dev/null 2>&1
cd ..

if [ -f "$ZIP_FILE" ]; then
  FILE_SIZE=$(ls -lh "$ZIP_FILE" | awk '{print $5}')
  echo "✅ ZIPファイルを作成しました: $ZIP_FILE ($FILE_SIZE)"
  echo ""
  echo "📦 次のステップ:"
  echo "1. Chrome Web Store Developer Dashboard にアクセス"
  echo "2. 拡張機能を選択"
  echo "3. 新しいパッケージをアップロード: $ZIP_FILE"
  echo "4. 変更内容を記載"
  echo "5. 審査を提出"
else
  echo "❌ エラー: ZIPファイルの作成に失敗しました"
  exit 1
fi
