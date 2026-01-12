using System;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using WindowsNativeAssistant.Models;
using WindowsNativeAssistant.Storage;

namespace WindowsNativeAssistant.UI
{
    public partial class MainWindow : Window
    {
        private UserData _userData;
        private string _currentCategoryId = "diagnoses";
        private IntPtr _lastActiveWindow = IntPtr.Zero;

        // 貼り付けリクエストイベント
        public event EventHandler<PasteRequestEventArgs>? PasteRequested;

        // Win32 API
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        public MainWindow()
        {
            InitializeComponent();
            _userData = LocalStorage.Load();
            LoadUI();
        }

        /// <summary>
        /// UIを読み込み
        /// </summary>
        private void LoadUI()
        {
            DirectPasteToggle.IsChecked = _userData.TemplatesDirectPaste;
            RenderCategories();
            RenderTemplates();
        }

        /// <summary>
        /// カテゴリボタンを描画
        /// </summary>
        private void RenderCategories()
        {
            CategoryPanel.Children.Clear();

            foreach (var category in _userData.TemplateCategories)
            {
                var button = new Button
                {
                    Content = category.Name,
                    Tag = category.Id,
                    Style = category.Id == _currentCategoryId
                        ? (Style)FindResource("CategoryButtonSelectedStyle")
                        : (Style)FindResource("CategoryButtonStyle")
                };

                button.Click += CategoryButton_Click;
                CategoryPanel.Children.Add(button);
            }
        }

        /// <summary>
        /// 定型文ボタンを描画
        /// </summary>
        private void RenderTemplates()
        {
            TemplateListPanel.Children.Clear();

            var templates = _userData.GetTemplatesForCategory(_currentCategoryId);

            if (templates.Count == 0)
            {
                var emptyText = new TextBlock
                {
                    Text = "定型文がありません。\n下の入力欄から追加できます。",
                    Foreground = System.Windows.Media.Brushes.Gray,
                    TextAlignment = TextAlignment.Center,
                    Margin = new Thickness(0, 20, 0, 0)
                };
                TemplateListPanel.Children.Add(emptyText);
                return;
            }

            foreach (var template in templates)
            {
                var button = new Button
                {
                    Content = template,
                    Tag = template,
                    Style = (Style)FindResource("TemplateButtonStyle")
                };

                button.Click += TemplateButton_Click;

                // 右クリックで削除メニュー
                var contextMenu = new ContextMenu();
                var deleteItem = new MenuItem { Header = "削除" };
                deleteItem.Click += (s, e) => DeleteTemplate(template);
                contextMenu.Items.Add(deleteItem);
                button.ContextMenu = contextMenu;

                TemplateListPanel.Children.Add(button);
            }
        }

        /// <summary>
        /// カテゴリボタンクリック
        /// </summary>
        private void CategoryButton_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string categoryId)
            {
                _currentCategoryId = categoryId;
                RenderCategories();
                RenderTemplates();
            }
        }

        /// <summary>
        /// 定型文ボタンクリック - 貼り付け実行
        /// </summary>
        private void TemplateButton_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string template)
            {
                if (_userData.TemplatesDirectPaste && _lastActiveWindow != IntPtr.Zero)
                {
                    // 直接貼り付けモード
                    PasteRequested?.Invoke(this, new PasteRequestEventArgs
                    {
                        Text = template,
                        TargetWindow = _lastActiveWindow
                    });

                    StatusText.Text = $"貼付: {(template.Length > 20 ? template.Substring(0, 20) + "..." : template)}";
                }
                else
                {
                    // クリップボードにコピーのみ
                    try
                    {
                        Clipboard.SetText(template);
                        StatusText.Text = $"コピー: {(template.Length > 20 ? template.Substring(0, 20) + "..." : template)}";
                    }
                    catch (Exception ex)
                    {
                        StatusText.Text = $"コピー失敗: {ex.Message}";
                    }
                }
            }
        }

        /// <summary>
        /// 新規定型文追加
        /// </summary>
        private void AddTemplate_Click(object sender, RoutedEventArgs e)
        {
            AddNewTemplate();
        }

        private void NewTemplateInput_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                AddNewTemplate();
                e.Handled = true;
            }
        }

        private void AddNewTemplate()
        {
            var text = NewTemplateInput.Text.Trim();
            if (string.IsNullOrEmpty(text))
            {
                return;
            }

            _userData.AddTemplate(_currentCategoryId, text);
            LocalStorage.Save(_userData);

            NewTemplateInput.Clear();
            RenderTemplates();

            StatusText.Text = $"追加: {(text.Length > 20 ? text.Substring(0, 20) + "..." : text)}";
        }

        /// <summary>
        /// 定型文削除
        /// </summary>
        private void DeleteTemplate(string template)
        {
            var result = MessageBox.Show(
                $"「{template}」を削除しますか？",
                "確認",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question
            );

            if (result == MessageBoxResult.Yes)
            {
                _userData.RemoveTemplate(_currentCategoryId, template);
                LocalStorage.Save(_userData);
                RenderTemplates();
                StatusText.Text = "削除しました";
            }
        }

        /// <summary>
        /// 定型文管理画面を開く
        /// </summary>
        private void ManageTemplates_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new TemplateManagerWindow(_userData);
            dialog.Owner = this;
            if (dialog.ShowDialog() == true)
            {
                _userData = dialog.UserData;
                LocalStorage.Save(_userData);
                RenderCategories();
                RenderTemplates();
            }
        }

        /// <summary>
        /// 直接貼り付けトグル変更
        /// </summary>
        private void DirectPasteToggle_Changed(object sender, RoutedEventArgs e)
        {
            _userData.TemplatesDirectPaste = DirectPasteToggle.IsChecked ?? true;
            LocalStorage.Save(_userData);

            StatusText.Text = _userData.TemplatesDirectPaste
                ? "直接貼り付け: ON"
                : "直接貼り付け: OFF (クリップボードにコピー)";
        }

        /// <summary>
        /// ウィンドウを表示する前にアクティブウィンドウを記録
        /// </summary>
        public void ShowAndCapture()
        {
            _lastActiveWindow = GetForegroundWindow();
            Show();
            Activate();
        }

        /// <summary>
        /// ターゲットウィンドウを設定
        /// </summary>
        public void SetTargetWindow(IntPtr handle)
        {
            _lastActiveWindow = handle;
        }

        private void Window_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                Hide();
            }
        }

        private void Window_Closing(object sender, CancelEventArgs e)
        {
            // 閉じる代わりに非表示
            e.Cancel = true;
            Hide();
        }

        /// <summary>
        /// データを再読み込み
        /// </summary>
        public void ReloadData()
        {
            _userData = LocalStorage.Load();
            LoadUI();
        }
    }

    /// <summary>
    /// 貼り付けリクエストイベント引数
    /// </summary>
    public class PasteRequestEventArgs : EventArgs
    {
        public string Text { get; set; } = "";
        public IntPtr TargetWindow { get; set; } = IntPtr.Zero;
    }
}
