using System;
using System.Windows;
using System.Windows.Controls;
using WindowsNativeAssistant.Models;

namespace WindowsNativeAssistant.UI
{
    public partial class TemplateManagerWindow : Window
    {
        public UserData UserData { get; private set; }
        private string _currentCategoryId = "";

        public TemplateManagerWindow(UserData userData)
        {
            InitializeComponent();
            UserData = userData;
            LoadUI();
        }

        private void LoadUI()
        {
            RenderCategories();

            // カテゴリセレクター設定
            CategorySelector.ItemsSource = UserData.TemplateCategories;
            if (UserData.TemplateCategories.Count > 0)
            {
                CategorySelector.SelectedIndex = 0;
                _currentCategoryId = UserData.TemplateCategories[0].Id;
            }

            RenderTemplates();
        }

        private void RenderCategories()
        {
            CategoryList.Items.Clear();

            foreach (var category in UserData.TemplateCategories)
            {
                var panel = new StackPanel
                {
                    Orientation = Orientation.Horizontal,
                    Margin = new Thickness(0, 0, 8, 8)
                };

                var border = new Border
                {
                    Background = new System.Windows.Media.SolidColorBrush(
                        System.Windows.Media.Color.FromRgb(240, 240, 240)),
                    CornerRadius = new CornerRadius(4),
                    Padding = new Thickness(8, 4, 4, 4)
                };

                var innerPanel = new StackPanel { Orientation = Orientation.Horizontal };

                var text = new TextBlock
                {
                    Text = category.Name,
                    VerticalAlignment = VerticalAlignment.Center,
                    Margin = new Thickness(0, 0, 5, 0)
                };

                var deleteButton = new Button
                {
                    Content = "×",
                    Background = System.Windows.Media.Brushes.Transparent,
                    BorderThickness = new Thickness(0),
                    Foreground = System.Windows.Media.Brushes.Gray,
                    Cursor = System.Windows.Input.Cursors.Hand,
                    Tag = category.Id,
                    Padding = new Thickness(4, 0, 4, 0),
                    FontSize = 12
                };
                deleteButton.Click += DeleteCategory_Click;

                innerPanel.Children.Add(text);
                innerPanel.Children.Add(deleteButton);
                border.Child = innerPanel;
                panel.Children.Add(border);
                CategoryList.Items.Add(panel);
            }
        }

        private void RenderTemplates()
        {
            TemplateList.Items.Clear();

            if (string.IsNullOrEmpty(_currentCategoryId))
                return;

            var templates = UserData.GetTemplatesForCategory(_currentCategoryId);

            foreach (var template in templates)
            {
                var panel = new Grid { Margin = new Thickness(0, 2, 0, 2) };
                panel.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                panel.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                var text = new TextBlock
                {
                    Text = template,
                    VerticalAlignment = VerticalAlignment.Center,
                    TextTrimming = TextTrimming.CharacterEllipsis
                };
                Grid.SetColumn(text, 0);

                var deleteButton = new Button
                {
                    Content = "削除",
                    Background = System.Windows.Media.Brushes.Transparent,
                    BorderThickness = new Thickness(0),
                    Foreground = new System.Windows.Media.SolidColorBrush(
                        System.Windows.Media.Color.FromRgb(239, 68, 68)),
                    Cursor = System.Windows.Input.Cursors.Hand,
                    Tag = template,
                    FontSize = 11
                };
                deleteButton.Click += DeleteTemplate_Click;
                Grid.SetColumn(deleteButton, 1);

                panel.Children.Add(text);
                panel.Children.Add(deleteButton);
                TemplateList.Items.Add(panel);
            }
        }

        private void CategorySelector_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (CategorySelector.SelectedItem is TemplateCategory category)
            {
                _currentCategoryId = category.Id;
                RenderTemplates();
            }
        }

        private void AddCategory_Click(object sender, RoutedEventArgs e)
        {
            var name = NewCategoryInput.Text.Trim();
            if (string.IsNullOrEmpty(name))
            {
                MessageBox.Show("カテゴリ名を入力してください。", "エラー", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // IDを生成（名前をベースに）
            var id = name.ToLower().Replace(" ", "_") + "_" + DateTime.Now.Ticks;

            UserData.AddCategory(id, name);
            NewCategoryInput.Clear();

            // UI更新
            RenderCategories();
            CategorySelector.ItemsSource = null;
            CategorySelector.ItemsSource = UserData.TemplateCategories;
            CategorySelector.SelectedValue = id;
        }

        private void DeleteCategory_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string categoryId)
            {
                var category = UserData.TemplateCategories.Find(c => c.Id == categoryId);
                if (category == null) return;

                var result = MessageBox.Show(
                    $"カテゴリ「{category.Name}」を削除しますか？\n含まれる定型文もすべて削除されます。",
                    "確認",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning
                );

                if (result == MessageBoxResult.Yes)
                {
                    UserData.RemoveCategory(categoryId);

                    // UI更新
                    RenderCategories();
                    CategorySelector.ItemsSource = null;
                    CategorySelector.ItemsSource = UserData.TemplateCategories;

                    if (UserData.TemplateCategories.Count > 0)
                    {
                        CategorySelector.SelectedIndex = 0;
                    }
                    else
                    {
                        _currentCategoryId = "";
                        RenderTemplates();
                    }
                }
            }
        }

        private void AddTemplate_Click(object sender, RoutedEventArgs e)
        {
            var text = NewTemplateInput.Text.Trim();
            if (string.IsNullOrEmpty(text))
            {
                MessageBox.Show("定型文を入力してください。", "エラー", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrEmpty(_currentCategoryId))
            {
                MessageBox.Show("カテゴリを選択してください。", "エラー", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            UserData.AddTemplate(_currentCategoryId, text);
            NewTemplateInput.Clear();
            RenderTemplates();
        }

        private void DeleteTemplate_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string template)
            {
                UserData.RemoveTemplate(_currentCategoryId, template);
                RenderTemplates();
            }
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = true;
            Close();
        }
    }
}
