using System;
using System.IO;
using System.Text.Json;

namespace WindowsNativeAssistant.Config
{
    /// <summary>
    /// Configuration file manager
    /// </summary>
    public class ConfigManager
    {
        private static readonly string ConfigFileName = "config.json";
        private static readonly string ConfigDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "KarteAI"
        );

        private static readonly string ConfigFilePath = Path.Combine(ConfigDirectory, ConfigFileName);

        /// <summary>
        /// Load configuration from file
        /// </summary>
        public static AppConfig Load()
        {
            try
            {
                if (!File.Exists(ConfigFilePath))
                {
                    var defaultConfig = new AppConfig();
                    Save(defaultConfig);
                    return defaultConfig;
                }

                var json = File.ReadAllText(ConfigFilePath);
                var config = JsonSerializer.Deserialize<AppConfig>(json);
                return config ?? new AppConfig();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to load config: {ex.Message}");
                return new AppConfig();
            }
        }

        /// <summary>
        /// Save configuration to file
        /// </summary>
        public static void Save(AppConfig config)
        {
            try
            {
                if (!Directory.Exists(ConfigDirectory))
                {
                    Directory.CreateDirectory(ConfigDirectory);
                }

                var options = new JsonSerializerOptions
                {
                    WriteIndented = true
                };

                var json = JsonSerializer.Serialize(config, options);
                File.WriteAllText(ConfigFilePath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to save config: {ex.Message}");
            }
        }

        /// <summary>
        /// Get configuration file path
        /// </summary>
        public static string GetConfigPath() => ConfigFilePath;
    }
}
