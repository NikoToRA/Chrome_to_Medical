namespace WindowsNativeAssistant.Models
{
    /// <summary>
    /// AI generation template
    /// </summary>
    public class Template
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PromptTemplate { get; set; } = string.Empty;

        public static List<Template> GetDefaultTemplates()
        {
            return new List<Template>
            {
                new Template
                {
                    Id = "soap",
                    Name = "SOAP記録",
                    Description = "SOAP形式の診療記録を生成",
                    PromptTemplate = "以下の情報からSOAP形式の診療記録を作成してください:\n\n{userInput}"
                },
                new Template
                {
                    Id = "summary",
                    Name = "要約",
                    Description = "診療内容の要約を生成",
                    PromptTemplate = "以下の診療内容を簡潔に要約してください:\n\n{userInput}"
                },
                new Template
                {
                    Id = "prescription",
                    Name = "処方メモ",
                    Description = "処方内容を整形",
                    PromptTemplate = "以下の処方情報を整形してください:\n\n{userInput}"
                }
            };
        }
    }
}
