using System.Windows;
using WindowsNativeAssistant.Config;

namespace WindowsNativeAssistant.UI
{
    public partial class SettingsWindow : Window
    {
        private AppConfig _config;

        public SettingsWindow(AppConfig config)
        {
            InitializeComponent();
            _config = config;
            LoadSettings();
        }

        private void LoadSettings()
        {
            CurrentHotkeyTextBlock.Text = $"{_config.Hotkey.Modifiers}+{_config.Hotkey.Key}";
            ApiEndpointTextBox.Text = _config.Api.Endpoint;
            TimeoutTextBox.Text = _config.Api.TimeoutSeconds.ToString();
            LoggingEnabledCheckBox.IsChecked = _config.Logging.Enabled;
            IncludeContentCheckBox.IsChecked = _config.Logging.IncludeContent;
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            // Validate and save
            if (!int.TryParse(TimeoutTextBox.Text, out int timeout) || timeout <= 0)
            {
                MessageBox.Show("タイムアウトは正の整数で指定してください。", "エラー",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            _config.Api.Endpoint = ApiEndpointTextBox.Text;
            _config.Api.TimeoutSeconds = timeout;
            _config.Logging.Enabled = LoggingEnabledCheckBox.IsChecked ?? true;
            _config.Logging.IncludeContent = IncludeContentCheckBox.IsChecked ?? false;

            ConfigManager.Save(_config);

            MessageBox.Show("設定を保存しました。\n一部の設定はアプリケーションの再起動後に反映されます。",
                "保存完了", MessageBoxButton.OK, MessageBoxImage.Information);

            DialogResult = true;
            Close();
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
