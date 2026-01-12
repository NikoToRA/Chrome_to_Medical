using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WindowsNativeAssistant.Models
{
    /// <summary>
    /// ユーザーデータ - Chrome拡張と同じ構造
    /// </summary>
    public class UserData
    {
        /// <summary>
        /// 定型文カテゴリ
        /// </summary>
        [JsonPropertyName("templateCategories")]
        public List<TemplateCategory> TemplateCategories { get; set; } = new();

        /// <summary>
        /// 定型文（カテゴリID -> 定型文リスト）
        /// </summary>
        [JsonPropertyName("templates")]
        public Dictionary<string, List<string>> Templates { get; set; } = new();

        /// <summary>
        /// AIエージェント（将来用）
        /// </summary>
        [JsonPropertyName("aiAgents")]
        public List<AIAgent> AIAgents { get; set; } = new();

        /// <summary>
        /// 選択中のエージェントID（将来用）
        /// </summary>
        [JsonPropertyName("selectedAgentId")]
        public string SelectedAgentId { get; set; } = "";

        /// <summary>
        /// 定型文の直接貼り付け設定
        /// </summary>
        [JsonPropertyName("templatesDirectPaste")]
        public bool TemplatesDirectPaste { get; set; } = true;

        /// <summary>
        /// 最終更新日時
        /// </summary>
        [JsonPropertyName("updatedAt")]
        public string UpdatedAt { get; set; } = "";

        /// <summary>
        /// デフォルトデータを作成
        /// </summary>
        public static UserData CreateDefault()
        {
            return new UserData
            {
                TemplateCategories = new List<TemplateCategory>
                {
                    new() { Id = "diagnoses", Name = "病名" },
                    new() { Id = "medications", Name = "薬剤" },
                    new() { Id = "phrases", Name = "定型文" }
                },
                Templates = new Dictionary<string, List<string>>
                {
                    ["diagnoses"] = new List<string>
                    {
                        "急性上気道炎",
                        "インフルエンザ",
                        "胃潰瘍",
                        "高血圧症",
                        "脂質異常症"
                    },
                    ["medications"] = new List<string>(),
                    ["phrases"] = new List<string>
                    {
                        "2週間後再診",
                        "栄養指導を行なった",
                        "休養を指示した",
                        "副作用について説明した",
                        "経過良好"
                    }
                },
                AIAgents = new List<AIAgent>(),
                SelectedAgentId = "",
                TemplatesDirectPaste = true,
                UpdatedAt = DateTime.UtcNow.ToString("o")
            };
        }

        /// <summary>
        /// 特定カテゴリの定型文を取得
        /// </summary>
        public List<string> GetTemplatesForCategory(string categoryId)
        {
            if (Templates.TryGetValue(categoryId, out var templates))
            {
                return templates;
            }
            return new List<string>();
        }

        /// <summary>
        /// 定型文を追加
        /// </summary>
        public void AddTemplate(string categoryId, string template)
        {
            if (!Templates.ContainsKey(categoryId))
            {
                Templates[categoryId] = new List<string>();
            }

            if (!Templates[categoryId].Contains(template))
            {
                Templates[categoryId].Add(template);
            }
        }

        /// <summary>
        /// 定型文を削除
        /// </summary>
        public void RemoveTemplate(string categoryId, string template)
        {
            if (Templates.ContainsKey(categoryId))
            {
                Templates[categoryId].Remove(template);
            }
        }

        /// <summary>
        /// カテゴリを追加
        /// </summary>
        public void AddCategory(string id, string name)
        {
            if (!TemplateCategories.Exists(c => c.Id == id))
            {
                TemplateCategories.Add(new TemplateCategory { Id = id, Name = name });
                Templates[id] = new List<string>();
            }
        }

        /// <summary>
        /// カテゴリを削除
        /// </summary>
        public void RemoveCategory(string id)
        {
            TemplateCategories.RemoveAll(c => c.Id == id);
            Templates.Remove(id);
        }
    }

    /// <summary>
    /// 定型文カテゴリ
    /// </summary>
    public class TemplateCategory
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";
    }

    /// <summary>
    /// AIエージェント（将来用）
    /// </summary>
    public class AIAgent
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        [JsonPropertyName("systemPrompt")]
        public string SystemPrompt { get; set; } = "";

        [JsonPropertyName("isDefault")]
        public bool IsDefault { get; set; } = false;
    }
}
