using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using WindowsNativeAssistant.Models;

namespace WindowsNativeAssistant.Storage
{
    /// <summary>
    /// Local storage manager - Chrome拡張のStorageManagerと同等の機能
    /// </summary>
    public class LocalStorage
    {
        private static readonly string AppDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "KarteAI"
        );

        private static readonly string UserDataFile = Path.Combine(AppDataFolder, "userdata.json");

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        /// <summary>
        /// ユーザーデータを読み込み
        /// </summary>
        public static async Task<UserData> LoadAsync()
        {
            try
            {
                EnsureDirectoryExists();

                if (!File.Exists(UserDataFile))
                {
                    var defaultData = UserData.CreateDefault();
                    await SaveAsync(defaultData);
                    return defaultData;
                }

                var json = await File.ReadAllTextAsync(UserDataFile);
                var data = JsonSerializer.Deserialize<UserData>(json, JsonOptions);
                return data ?? UserData.CreateDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LocalStorage] Load error: {ex.Message}");
                return UserData.CreateDefault();
            }
        }

        /// <summary>
        /// ユーザーデータを保存
        /// </summary>
        public static async Task SaveAsync(UserData data)
        {
            try
            {
                EnsureDirectoryExists();

                data.UpdatedAt = DateTime.UtcNow.ToString("o");
                var json = JsonSerializer.Serialize(data, JsonOptions);
                await File.WriteAllTextAsync(UserDataFile, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LocalStorage] Save error: {ex.Message}");
            }
        }

        /// <summary>
        /// 同期データを読み込み
        /// </summary>
        public static UserData Load()
        {
            return LoadAsync().GetAwaiter().GetResult();
        }

        /// <summary>
        /// 同期データを保存
        /// </summary>
        public static void Save(UserData data)
        {
            SaveAsync(data).GetAwaiter().GetResult();
        }

        /// <summary>
        /// データフォルダのパスを取得
        /// </summary>
        public static string GetDataFolder() => AppDataFolder;

        /// <summary>
        /// データファイルのパスを取得
        /// </summary>
        public static string GetDataFilePath() => UserDataFile;

        private static void EnsureDirectoryExists()
        {
            if (!Directory.Exists(AppDataFolder))
            {
                Directory.CreateDirectory(AppDataFolder);
            }
        }
    }
}
