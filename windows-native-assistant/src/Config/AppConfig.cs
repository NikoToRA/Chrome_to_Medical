using System.Text.Json.Serialization;

namespace WindowsNativeAssistant.Config
{
    /// <summary>
    /// Application configuration
    /// </summary>
    public class AppConfig
    {
        [JsonPropertyName("hotkey")]
        public HotkeyConfig Hotkey { get; set; } = new HotkeyConfig();

        [JsonPropertyName("api")]
        public ApiConfig Api { get; set; } = new ApiConfig();

        [JsonPropertyName("paste")]
        public PasteConfig Paste { get; set; } = new PasteConfig();

        [JsonPropertyName("logging")]
        public LoggingConfig Logging { get; set; } = new LoggingConfig();
    }

    public class HotkeyConfig
    {
        [JsonPropertyName("modifiers")]
        public string Modifiers { get; set; } = "Control+Alt";

        [JsonPropertyName("key")]
        public string Key { get; set; } = "A";
    }

    public class ApiConfig
    {
        [JsonPropertyName("endpoint")]
        public string Endpoint { get; set; } = "https://func-karte-ai-1763705952.azurewebsites.net/api/chat";

        [JsonPropertyName("token")]
        public string Token { get; set; } = string.Empty;

        [JsonPropertyName("timeoutSeconds")]
        public int TimeoutSeconds { get; set; } = 60;
    }

    public class PasteConfig
    {
        [JsonPropertyName("retryCount")]
        public int RetryCount { get; set; } = 2;

        [JsonPropertyName("retryDelayMs")]
        public int[] RetryDelayMs { get; set; } = new int[] { 200, 500 };
    }

    public class LoggingConfig
    {
        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; } = true;

        [JsonPropertyName("includeContent")]
        public bool IncludeContent { get; set; } = false;

        [JsonPropertyName("logPath")]
        public string LogPath { get; set; } = "logs";
    }
}
