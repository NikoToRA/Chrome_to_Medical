using System.Text.Json.Serialization;

namespace WindowsNativeAssistant.Models
{
    /// <summary>
    /// AI generation request
    /// </summary>
    public class GenerateRequest
    {
        [JsonPropertyName("templateId")]
        public string TemplateId { get; set; } = string.Empty;

        [JsonPropertyName("userInput")]
        public string UserInput { get; set; } = string.Empty;

        [JsonPropertyName("context")]
        public Dictionary<string, string>? Context { get; set; }
    }

    /// <summary>
    /// AI generation response
    /// </summary>
    public class GenerateResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("result")]
        public string? Result { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }
}
