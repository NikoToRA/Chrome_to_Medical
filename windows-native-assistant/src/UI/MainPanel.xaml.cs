using System;
using System.Linq;
using System.Windows;
using System.Windows.Input;
using WindowsNativeAssistant.Models;

namespace WindowsNativeAssistant.UI
{
    public partial class MainPanel : Window
    {
        public event EventHandler<GenerateRequestEventArgs>? GenerateRequested;

        public MainPanel()
        {
            InitializeComponent();
            LoadTemplates();
        }

        private void LoadTemplates()
        {
            var templates = Template.GetDefaultTemplates();
            TemplateComboBox.ItemsSource = templates;
            TemplateComboBox.SelectedIndex = 0;
        }

        private void GenerateButton_Click(object sender, RoutedEventArgs e)
        {
            var selectedTemplate = TemplateComboBox.SelectedItem as Template;
            if (selectedTemplate == null)
            {
                MessageBox.Show("テンプレートを選択してください。", "エラー", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var userInput = UserInputTextBox.Text.Trim();
            if (string.IsNullOrEmpty(userInput))
            {
                MessageBox.Show("入力内容を記入してください。", "エラー", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // Fire event
            GenerateRequested?.Invoke(this, new GenerateRequestEventArgs
            {
                Template = selectedTemplate,
                UserInput = userInput
            });
        }

        private void Window_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                Hide();
            }
        }

        public void SetStatus(string message, bool isProgress = false)
        {
            Dispatcher.Invoke(() =>
            {
                StatusTextBlock.Text = message;
                ProgressBar.Visibility = isProgress ? Visibility.Visible : Visibility.Collapsed;
                ProgressBar.IsIndeterminate = isProgress;
            });
        }

        public void EnableInput(bool enabled)
        {
            Dispatcher.Invoke(() =>
            {
                TemplateComboBox.IsEnabled = enabled;
                UserInputTextBox.IsEnabled = enabled;
                GenerateButton.IsEnabled = enabled;
            });
        }

        public void ClearInput()
        {
            Dispatcher.Invoke(() =>
            {
                UserInputTextBox.Clear();
            });
        }
    }

    public class GenerateRequestEventArgs : EventArgs
    {
        public Template Template { get; set; } = null!;
        public string UserInput { get; set; } = string.Empty;
    }
}
