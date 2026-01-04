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
        private AppController? _appController;
        private Window? _hiddenWindow;

        private void OnStartup(object sender, StartupEventArgs e)
        {
            try
            {
                // Load configuration
                var config = ConfigManager.Load();

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
                var hotkeyManager = new HotkeyManager(windowHandle);
                var pasteEngine = new PasteEngine(config);
                var aiClient = new AIClient(config);
                var logger = new Logger(config);
                var mainPanel = new MainPanel();

                // Initialize app controller
                _appController = new AppController(
                    config,
                    hotkeyManager,
                    pasteEngine,
                    aiClient,
                    logger,
                    mainPanel
                );

                if (!_appController.Initialize())
                {
                    MessageBox.Show(
                        "アプリケーションの初期化に失敗しました。",
                        "エラー",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error
                    );
                    Shutdown();
                    return;
                }

                // Setup tray icon
                _trayIcon = (TaskbarIcon)FindResource("TrayIcon");
                if (_trayIcon != null)
                {
                    _trayIcon.ToolTipText = "Windows Native Assistant - Ready";
                }

                // Show startup notification
                MessageBox.Show(
                    $"Windows Native Assistant が起動しました。\n\n" +
                    $"ホットキー: {config.Hotkey.Modifiers}+{config.Hotkey.Key}\n\n" +
                    "システムトレイアイコンから設定を変更できます。",
                    "起動完了",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information
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

        private void OnExit(object sender, ExitEventArgs e)
        {
            _appController?.Cleanup();
            _trayIcon?.Dispose();
            _hiddenWindow?.Close();
        }

        private void ShowPanel_Click(object sender, RoutedEventArgs e)
        {
            // Panel is shown via hotkey, this is just for manual access
            MessageBox.Show(
                "パネルを開くには、ホットキーを使用してください。",
                "情報",
                MessageBoxButton.OK,
                MessageBoxImage.Information
            );
        }

        private void ShowSettings_Click(object sender, RoutedEventArgs e)
        {
            _appController?.ShowSettings();
        }

        private void Exit_Click(object sender, RoutedEventArgs e)
        {
            Shutdown();
        }
    }
}
