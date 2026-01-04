using System;
using System.Threading.Tasks;
using System.Windows;
using WindowsNativeAssistant.Config;
using WindowsNativeAssistant.Core;
using WindowsNativeAssistant.Models;
using WindowsNativeAssistant.UI;

namespace WindowsNativeAssistant
{
    /// <summary>
    /// Application controller - manages state and coordinates components
    /// </summary>
    public class AppController
    {
        private readonly AppConfig _config;
        private readonly HotkeyManager _hotkeyManager;
        private readonly PasteEngine _pasteEngine;
        private readonly AIClient _aiClient;
        private readonly Logger _logger;
        private readonly MainPanel _mainPanel;

        private AppState _currentState = AppState.Idle;
        private IntPtr _targetWindowHandle = IntPtr.Zero;

        public AppController(
            AppConfig config,
            HotkeyManager hotkeyManager,
            PasteEngine pasteEngine,
            AIClient aiClient,
            Logger logger,
            MainPanel mainPanel)
        {
            _config = config;
            _hotkeyManager = hotkeyManager;
            _pasteEngine = pasteEngine;
            _aiClient = aiClient;
            _logger = logger;
            _mainPanel = mainPanel;

            // Wire up events
            _hotkeyManager.HotkeyPressed += OnHotkeyPressed;
            _mainPanel.GenerateRequested += OnGenerateRequested;
        }

        /// <summary>
        /// Initialize the controller
        /// </summary>
        public bool Initialize()
        {
            try
            {
                // Register hotkey
                bool hotkeyRegistered = _hotkeyManager.Register(
                    _config.Hotkey.Modifiers,
                    _config.Hotkey.Key
                );

                if (!hotkeyRegistered)
                {
                    MessageBox.Show(
                        $"ホットキー {_config.Hotkey.Modifiers}+{_config.Hotkey.Key} の登録に失敗しました。\n" +
                        "別のアプリケーションが使用している可能性があります。",
                        "エラー",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error
                    );
                    return false;
                }

                SetState(AppState.Idle);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError("Failed to initialize AppController", ex);
                return false;
            }
        }

        /// <summary>
        /// Handle hotkey press
        /// </summary>
        private void OnHotkeyPressed(object? sender, EventArgs e)
        {
            try
            {
                if (_currentState != AppState.Idle)
                {
                    // Already processing, ignore
                    return;
                }

                // Capture target window before showing panel
                _targetWindowHandle = _pasteEngine.GetCurrentActiveWindow();

                if (_targetWindowHandle == IntPtr.Zero)
                {
                    MessageBox.Show(
                        "対象ウィンドウを検出できませんでした。",
                        "エラー",
                        MessageBoxButton.OK,
                        MessageBoxImage.Warning
                    );
                    return;
                }

                // Show panel
                _mainPanel.Dispatcher.Invoke(() =>
                {
                    _mainPanel.Show();
                    _mainPanel.Activate();
                    _mainPanel.SetStatus("テンプレートを選択して、入力内容を記入してください。");
                });

                SetState(AppState.PanelOpen);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error in OnHotkeyPressed", ex);
            }
        }

        /// <summary>
        /// Handle generate request from UI
        /// </summary>
        private async void OnGenerateRequested(object? sender, GenerateRequestEventArgs e)
        {
            try
            {
                SetState(AppState.Generating);

                _mainPanel.EnableInput(false);
                _mainPanel.SetStatus("AI生成中...", isProgress: true);

                // Generate content
                var response = await _aiClient.GenerateAsync(
                    e.Template.Id,
                    e.UserInput,
                    e.Template
                );

                if (!response.Success || string.IsNullOrEmpty(response.Result))
                {
                    _mainPanel.SetStatus($"生成失敗: {response.Error}");
                    _mainPanel.EnableInput(true);
                    SetState(AppState.Failure);

                    MessageBox.Show(
                        $"AI生成に失敗しました。\n\nエラー: {response.Error}",
                        "エラー",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error
                    );

                    SetState(AppState.PanelOpen);
                    return;
                }

                // Hide panel before pasting
                _mainPanel.Hide();

                // Execute paste
                SetState(AppState.Pasting);
                await Task.Delay(200); // Brief delay for panel to hide

                var pasteResult = _pasteEngine.ExecutePaste(_targetWindowHandle, response.Result);

                // Log operation
                _logger.LogOperation(
                    e.Template.Id,
                    pasteResult,
                    _targetWindowHandle,
                    _config.Logging.IncludeContent ? response.Result : null
                );

                // Show result
                if (pasteResult.Success)
                {
                    SetState(AppState.Success);

                    // Show success notification
                    MessageBox.Show(
                        "貼り付けが完了しました。",
                        "成功",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information
                    );

                    // Clear input for next use
                    _mainPanel.ClearInput();
                }
                else
                {
                    SetState(AppState.Failure);

                    MessageBox.Show(
                        $"貼り付けに失敗しました。\n\n" +
                        $"理由: {pasteResult.Reason}\n" +
                        $"試行回数: {pasteResult.Attempts}\n\n" +
                        "対象ウィンドウにカーソルを置いて、再度お試しください。",
                        "エラー",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error
                    );
                }

                // Reset state
                _mainPanel.EnableInput(true);
                _mainPanel.SetStatus("");
                SetState(AppState.Idle);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error in OnGenerateRequested", ex);

                _mainPanel.EnableInput(true);
                _mainPanel.SetStatus("エラーが発生しました。");
                SetState(AppState.Failure);

                MessageBox.Show(
                    $"予期しないエラーが発生しました。\n\n{ex.Message}",
                    "エラー",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error
                );

                SetState(AppState.Idle);
            }
        }

        /// <summary>
        /// Set application state
        /// </summary>
        private void SetState(AppState newState)
        {
            _currentState = newState;
            Console.WriteLine($"State changed to: {newState}");
        }

        /// <summary>
        /// Show settings window
        /// </summary>
        public void ShowSettings()
        {
            var settingsWindow = new SettingsWindow(_config);
            settingsWindow.ShowDialog();
        }

        /// <summary>
        /// Cleanup resources
        /// </summary>
        public void Cleanup()
        {
            _hotkeyManager.Dispose();
        }
    }
}
