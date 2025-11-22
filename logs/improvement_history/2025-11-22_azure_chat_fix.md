# Azure Functions 移行とチャット機能改善の記録
作成日: 2025-11-22

## 1. 発生していた問題
- **Azure Functions 起動エラー**: `Worker was unable to load entry point 'index.js'` というエラーで関数が起動せず、500エラーが返っていた。
- **AI応答エラー**: `AIからの応答が不正です` というエラーが拡張機能側で発生。
- **応答なし（空の応答）**: AIが思考（Reasoning）だけでトークンを使い果たし、回答が出力されないケースがあった。

## 2. 原因と解決策

### A. Azure Functions 起動エラー
- **原因**:
    - `package.json` の `"main": "index.js"` が存在しないファイルを指していた。
    - `function.json` の `"scriptFile": "index.js"` がデフォルトの解決ロジックと競合していた可能性。
- **解決策**:
    - エントリーポイントを `chat/index.js` から `chat/handler.js` にリネームし、明示的に指定。
    - ルートにダミーの `index.js` を配置し、Node.jsプロジェクトとしての整合性を確保。
    - `.funcignore` を作成し、ローカルの `node_modules` がアップロードされないように除外（リモートビルドを強制）。

### B. AI応答エラー（不正な形式）
- **原因**:
    - 拡張機能が Claude (Anthropic) 形式のレスポンス（配列構造）を期待していたのに対し、Azure OpenAI はシンプルなテキスト形式を返していたため、パースに失敗。
- **解決策**:
    - `sidepanel.js` のレスポンス処理ロジックを修正し、文字列（Azure形式）と配列（Claude形式）の両方に対応できるようにした。
    - `handler.js` 側でも、万が一 `content` が null の場合に空文字を返すようガードを追加。

### C. 応答なし（トークン不足）
- **原因**:
    - 使用していたモデル (`gpt-5-mini` / `o1-mini`) が「推論強化型」であり、回答生成前の「思考」に大量のトークンを消費していた。
    - `max_completion_tokens` が `800` に設定されていたため、思考だけで上限に達し、回答が出力される前に処理が打ち切られていた。
- **解決策**:
    - `max_completion_tokens` を `5000` に大幅増量。
    - **推奨**: コスト削減と速度向上のため、Azure Portal側でモデルを `gpt-4o-mini` に変更することを提案（環境変数 `AZURE_OPENAI_DEPLOYMENT_NAME` で切り替え可能）。

## 3. リファクタリング内容
- **Claude遺産の削除**: `utils/storage.js` から不要なAPIキー管理ロジックを削除。`sidepanel.js` から `DEFAULT_MODEL` 定数を削除。
- **フロントエンド堅牢化**: `utils/api.js` にタイムアウト（60秒）とリトライ機能（1回）を追加し、Azure Functionsのコールドスタート対策を実施。
- **バックエンド整理**: `handler.js` でクライアントからの `model` 指定を無視し、環境変数のみでモデルを制御するように変更。

## 4. 今後の注意点
- **モデル変更**: AIモデルを変更したい場合は、コードではなく **Azure Portal の環境変数 (`AZURE_OPENAI_DEPLOYMENT_NAME`)** を変更すること。
- **デプロイ**: デプロイ時は必ず `--build remote` オプションを付けること（`func azure functionapp publish <APP_NAME> --build remote`）。
- **APIキー**: `local.settings.json` にはAPIキーが含まれるため、GitHubには絶対にプッシュしないこと（`.gitignore` で管理済みだが注意）。
