using System;
using System.IO;
using System.Text;
using WindowsNativeAssistant.Config;
using WindowsNativeAssistant.Models;

namespace WindowsNativeAssistant.Core
{
    /// <summary>
    /// Application logger
    /// </summary>
    public class Logger
    {
        private readonly AppConfig _config;
        private readonly string _logDirectory;

        public Logger(AppConfig config)
        {
            _config = config;
            _logDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "WindowsNativeAssistant",
                config.Logging.LogPath
            );

            if (!Directory.Exists(_logDirectory))
            {
                Directory.CreateDirectory(_logDirectory);
            }
        }

        /// <summary>
        /// Log a generation and paste operation
        /// </summary>
        public void LogOperation(
            string templateId,
            PasteResult pasteResult,
            IntPtr targetWindowHandle,
            string? content = null)
        {
            if (!_config.Logging.Enabled)
                return;

            try
            {
                var logEntry = new StringBuilder();
                logEntry.AppendLine($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}]");
                logEntry.AppendLine($"Template: {templateId}");
                logEntry.AppendLine($"Success: {pasteResult.Success}");
                logEntry.AppendLine($"Attempts: {pasteResult.Attempts}");

                if (!pasteResult.Success && pasteResult.Reason != null)
                {
                    logEntry.AppendLine($"Failure Reason: {pasteResult.Reason}");
                    logEntry.AppendLine($"Failure Type: {pasteResult.FailureType}");
                }

                logEntry.AppendLine($"Target Window: 0x{targetWindowHandle:X}");

                if (_config.Logging.IncludeContent && content != null)
                {
                    logEntry.AppendLine($"Content Length: {content.Length}");
                    logEntry.AppendLine($"Content: {content}");
                }

                logEntry.AppendLine(new string('-', 80));

                var logFileName = $"operations_{DateTime.Now:yyyy-MM-dd}.log";
                var logFilePath = Path.Combine(_logDirectory, logFileName);

                File.AppendAllText(logFilePath, logEntry.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to write log: {ex.Message}");
            }
        }

        /// <summary>
        /// Log an error
        /// </summary>
        public void LogError(string message, Exception? ex = null)
        {
            if (!_config.Logging.Enabled)
                return;

            try
            {
                var logEntry = new StringBuilder();
                logEntry.AppendLine($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] ERROR");
                logEntry.AppendLine($"Message: {message}");

                if (ex != null)
                {
                    logEntry.AppendLine($"Exception: {ex.GetType().Name}");
                    logEntry.AppendLine($"Details: {ex.Message}");
                    logEntry.AppendLine($"Stack Trace: {ex.StackTrace}");
                }

                logEntry.AppendLine(new string('-', 80));

                var logFileName = $"errors_{DateTime.Now:yyyy-MM-dd}.log";
                var logFilePath = Path.Combine(_logDirectory, logFileName);

                File.AppendAllText(logFilePath, logEntry.ToString());
            }
            catch (Exception logEx)
            {
                Console.WriteLine($"Failed to write error log: {logEx.Message}");
            }
        }
    }
}
