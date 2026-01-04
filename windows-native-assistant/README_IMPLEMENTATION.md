# Windows Native Assistant - 実装ガイド

## プロジェクト概要

EMS MAPS向けのWindows常駐型AIアシスタント。ホットキーで起動し、AI生成結果を自動的に対象ウィンドウへ貼り付けます。

## 技術スタック

- **.NET 8.0** - Windows Desktop Application
- **WPF** - UI Framework
- **C#** - Programming Language

## プロジェクト構成

```
windows-native-assistant/
├── src/
│   ├── WindowsNativeAssistant.csproj  # プロジェクトファイル
│   ├── App.xaml / App.xaml.cs         # アプリケーションエントリー
│   ├── AppController.cs               # メインコントローラー
│   │
│   ├── Core/                          # コアモジュール
│   │   ├── HotkeyManager.cs          # グローバルホットキー管理
│   │   ├── PasteEngine.cs            # 貼り付けエンジン（最重要）
│   │   ├── AIClient.cs               # AI API クライアント
│   │   └── Logger.cs                 # ロギング
│   │
│   ├── Models/                        # データモデル
│   │   ├── AppState.cs               # アプリケーション状態
│   │   ├── Template.cs               # AIテンプレート
│   │   ├── PasteResult.cs            # 貼り付け結果
│   │   └── GenerateRequest.cs        # AI生成リクエスト/レスポンス
│   │
│   ├── UI/                           # ユーザーインターフェース
│   │   ├── MainPanel.xaml/cs         # メインパネル
│   │   └── SettingsWindow.xaml/cs    # 設定ウィンドウ
│   │
│   └── Config/                       # 設定管理
│       ├── AppConfig.cs              # 設定データモデル
│       └── ConfigManager.cs          # 設定ファイル管理
│
├── design/                           # 設計ドキュメント
│   └── basic_design.md              # 基本設計書
│
├── requirements/                     # 要件定義
│   ├── requirements_definition.md
│   ├── user_flow.md
│   ├── acceptance_criteria.md
│   └── glossary.md
│
├── build.bat                        # ビルドスクリプト
└── README_IMPLEMENTATION.md         # このファイル
```

## ビルド手順

### 前提条件

1. **Windows 10/11** （開発・実行環境）
2. **.NET 8.0 SDK** インストール済み
   - https://dotnet.microsoft.com/download/dotnet/8.0

### ビルド方法

#### 方法1: ビルドスクリプト使用（推奨）

```cmd
cd windows-native-assistant
build.bat
```

#### 方法2: 手動ビルド

```cmd
cd windows-native-assistant/src

# パッケージ復元
dotnet restore

# ビルド
dotnet build -c Release

# 単一実行ファイルとして発行
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ..\publish
```

### ビルド成果物

- `publish/WindowsNativeAssistant.exe` - 実行ファイル
- 実行には .NET Runtime が不要（self-contained）

## 実行方法

### 初回起動

1. `WindowsNativeAssistant.exe` をダブルクリック
2. システムトレイにアイコンが表示される
3. ホットキー: **Ctrl+Alt+A**（デフォルト）

### 使用フロー

1. **MAPS（対象アプリ）**で入力欄にカーソルを置く
2. **Ctrl+Alt+A** を押下
3. パネルが表示される
   - テンプレート選択（SOAP/要約/処方メモ）
   - 入力内容を記入
4. **「生成して貼り付け」**ボタンをクリック
5. AI生成が完了すると、自動的にMAPSへ貼り付けられる

### 設定変更

- システムトレイアイコンを右クリック → **「設定」**
- API エンドポイント、タイムアウト、ログ設定を変更可能

## 設定ファイル

### 保存場所

```
%APPDATA%\WindowsNativeAssistant\config.json
```

### デフォルト設定

```json
{
  "hotkey": {
    "modifiers": "Control+Alt",
    "key": "A"
  },
  "api": {
    "endpoint": "https://func-karte-ai-1763705952.azurewebsites.net/api/chat",
    "token": "",
    "timeoutSeconds": 60
  },
  "paste": {
    "retryCount": 2,
    "retryDelayMs": [200, 500]
  },
  "logging": {
    "enabled": true,
    "includeContent": false,
    "logPath": "logs"
  }
}
```

## ログファイル

### 保存場所

```
%APPDATA%\WindowsNativeAssistant\logs\
```

### ログファイル

- `operations_YYYY-MM-DD.log` - 操作ログ
- `errors_YYYY-MM-DD.log` - エラーログ

### ログ内容（デフォルト）

- 時刻
- テンプレートID
- 成功/失敗
- リトライ回数
- 対象ウィンドウ情報

**注意**: デフォルトでは生成内容は記録されません（個人情報保護）

## トラブルシューティング

### ホットキーが動作しない

- 他のアプリケーションが同じホットキーを使用している可能性
- 設定から別のホットキーに変更（将来実装予定）

### 貼り付けが失敗する

1. **対象ウィンドウの確認**
   - ホットキー押下時点のアクティブウィンドウに貼り付けられます
   - 入力欄にカーソルがあることを確認

2. **リトライ回数の調整**
   - `config.json` の `paste.retryCount` を増やす
   - `paste.retryDelayMs` の待機時間を調整

3. **ログの確認**
   - `errors_YYYY-MM-DD.log` で失敗理由を確認

### AI生成が失敗する

1. **ネットワーク接続確認**
2. **APIエンドポイント確認**
   - 設定ウィンドウでエンドポイントURLを確認
3. **タイムアウト調整**
   - `api.timeoutSeconds` を増やす

## 開発環境セットアップ

### Visual Studio 2022

1. Visual Studio 2022 インストール
2. ワークロード「.NET デスクトップ開発」を選択
3. `WindowsNativeAssistant.csproj` を開く

### Visual Studio Code

1. VS Code インストール
2. C# Dev Kit 拡張機能インストール
3. `src` フォルダを開く

### デバッグ実行

```cmd
cd src
dotnet run
```

## 主要モジュール説明

### PasteEngine（最重要）

フォーカス復帰と自動貼り付けを実行する最も重要なモジュール。

**処理フロー**:
1. ターゲットウィンドウのHWNDを保持
2. フォーカス復帰（SetForegroundWindow）
3. クリップボードに書き込み
4. Ctrl+V を送出
5. リトライ戦略（最大2回）

**失敗分類**:
- `FocusRestoreFailed` - フォーカス復帰失敗
- `ClipboardWriteFailed` - クリップボード書き込み失敗
- `SendKeysFailed` - キー送出失敗

### HotkeyManager

Win32 API の `RegisterHotKey` を使用してグローバルホットキーを登録。

### AIClient

Azure Functions の `/api/chat` エンドポイントへHTTPリクエストを送信。

### AppController

アプリケーション全体の状態管理とコンポーネント間のオーケストレーション。

**状態遷移**:
- `Idle` → `PanelOpen` → `Generating` → `Pasting` → `Success/Failure` → `Idle`

## セキュリティ考慮事項

### 患者情報保護

- **ログには本文を含めない**（デフォルト）
- 設定で `includeContent: true` にすると本文がログに記録される（非推奨）

### 認証トークン

- `config.json` に平文で保存される
- 将来的には Windows Credential Manager への移行を検討

### 通信

- HTTPS（TLS）で暗号化
- Azure Functions エンドポイントと通信

## 今後の拡張計画

### Phase 2

- [ ] UI Automation による貼り付け結果の検証
- [ ] MAPS専用アダプタ（特定フィールド入力）
- [ ] ホットキー変更UI
- [ ] トークン安全保管（Credential Manager）

### Phase 3

- [ ] 複数フィールド分配機能
- [ ] 施設別テンプレート配布機能
- [ ] 自動更新機能

## ライセンスと依存関係

### NuGet パッケージ

- **Hardcodet.NotifyIcon.Wpf** (1.1.0) - システムトレイアイコン
- **Newtonsoft.Json** (13.0.3) - JSON処理（後方互換）
- **System.Text.Json** (8.0.5) - JSON処理（メイン）

## サポート

問題が発生した場合：

1. **ログ確認**: `%APPDATA%\WindowsNativeAssistant\logs\`
2. **設定リセット**: `config.json` を削除して再起動
3. **開発チーム連絡**: 詳細なログとともに報告

---

**最終更新**: 2026-01-04
**バージョン**: 0.1.0 MVP
