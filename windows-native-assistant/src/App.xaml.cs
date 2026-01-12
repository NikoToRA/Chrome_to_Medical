using System;
using System.Windows;
using System.Windows.Interop;
using Hardcodet.Wpf.TaskbarNotification;
using WindowsNativeAssistant.Config;
using WindowsNativeAssistant.Core;
using WindowsNativeAssistant.UI;

namespace WindowsNativeAssistant
{
    public partial class App : Application
    {
        private TaskbarIcon? _trayIcon;
        private Window? _hiddenWindow;
        private MainWindow? _mainWindow;
        private HotkeyManager? _hotkeyManager;
        private PasteEngine? _pasteEngine;
        private AppConfig? _config;

        private void OnStartup(object sender, StartupEventArgs e)
        {
            try
            {
                // Load configuration
                _config = ConfigManager.Load();

                // Create hidden window for receiving hotkey messages
                _hiddenWindow = new Window
                {
                    Width = 0,
                    Height = 0,
                    WindowStyle = WindowStyle.None,
                    ShowInTaskbar = false,
                    Visibility = Visibility.Hidden
                };
                _hiddenWindow.Show();
                _hiddenWindow.Hide();

                var windowHandle = new WindowInteropHelper(_hiddenWindow).Handle;

                // Initialize core components
                _hotkeyManager = new HotkeyManager(windowHandle);
                _pasteEngine = new PasteEngine(_config);

                // Initialize main window
                _mainWindow = new MainWindow();
                _mainWindow.PasteRequested += OnPasteRequested;

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
                }

                // Wire up hotkey event
                _hotkeyManager.HotkeyPressed += OnHotkeyPressed;

                // Setup tray icon
                _trayIcon = (TaskbarIcon)FindResource("TrayIcon");
                if (_trayIcon != null)
                {
                    _trayIcon.ToolTipText = "Karte AI+ Assistant - Ready";
                }

                // Show startup notification (簡略化)
                _trayIcon?.ShowBalloonTip(
                    "Karte AI+ Assistant",
                    $"起動しました。ホットキー: {_config.Hotkey.Modifiers}+{_config.Hotkey.Key}",
                    BalloonIcon.Info
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"起動中にエラーが発生しました。\n\n{ex.Message}",
                    "エラー",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error
                );
                Shutdown();
            }
        }

        /// <summary>
        /// ホットキー押下時の処理
        /// </summary>
        private void OnHotkeyPressed(object? sender, EventArgs e)
        {
            try
            {
                if (_mainWindow == null || _pasteEngine == null) return;

                // 現在のアクティブウィンドウを記録
                var targetWindow = _pasteEngine.GetCurrentActiveWindow();
                _mainWindow.SetTargetWindow(targetWindow);

                // ウィンドウを表示
                _mainWindow.Dispatcher.Invoke(() =>
                {
                    if (_mainWindow.IsVisible)
                    {
                        _mainWindow.Hide();
                    }
                    else
                    {
                        _mainWindow.Show();
                        _mainWindow.Activate();
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[App] OnHotkeyPressed error: {ex.Message}");
            }
        }

        /// <summary>
        /// 貼り付けリクエスト時の処理
        /// </summary>
        private void OnPasteRequested(object? sender, PasteRequestEventArgs e)
        {
            try
            {
                if (_pasteEngine == null || string.IsNullOrEmpty(e.Text)) return;

                // ウィンドウを非表示にしてから貼り付け
                _mainWindow?.Dispatcher.Invoke(() =>
                {
                    _mainWindow?.Hide();
                });

                // 少し待ってから貼り付け（ウィンドウが隠れるのを待つ）
                System.Threading.Thread.Sleep(100);

                // 貼り付け実行
                var result = _pasteEngine.ExecutePaste(e.TargetWindow, e.Text);

                if (!result.Success)
                {
                    Console.WriteLine($"[App] Paste failed: {result.Reason}");

                    // 失敗した場合はクリップボードにコピーのみ
                    _mainWindow?.Dispatcher.Invoke(() =>
                    {
                        try
                        {
                            Clipboard.SetText(e.Text);
                            _trayIcon?.ShowBalloonTip(
                                "貼り付け失敗",
                                "クリップボードにコピーしました。手動でCtrl+Vで貼り付けてください。",
                                BalloonIcon.Warning
                            );
                        }
                        catch { }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[App] OnPasteRequested error: {ex.Message}");
            }
        }

        private void OnExit(object sender, ExitEventArgs e)
        {
            _hotkeyManager?.Dispose();
            _trayIcon?.Dispose();
            _hiddenWindow?.Close();
            _mainWindow?.Close();
        }

        private void ShowPanel_Click(object sender, RoutedEventArgs e)
        {
            _mainWindow?.Dispatcher.Invoke(() =>
            {
                _mainWindow?.Show();
                _mainWindow?.Activate();
            });
        }

        private void ShowSettings_Click(object sender, RoutedEventArgs e)
        {
            if (_config != null)
            {
                var settingsWindow = new SettingsWindow(_config);
                settingsWindow.ShowDialog();
            }
        }

        private void Exit_Click(object sender, RoutedEventArgs e)
        {
            // 閉じる前に確認
            var result = MessageBox.Show(
                "Karte AI+ Assistantを終了しますか？",
                "確認",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question
            );

            if (result == MessageBoxResult.Yes)
            {
                // メインウィンドウの閉じるイベントをキャンセルしないようにする
                if (_mainWindow != null)
                {
                    _mainWindow.Closing -= (s, args) => args.Cancel = true;
                }
                Shutdown();
            }
        }
    }
}
