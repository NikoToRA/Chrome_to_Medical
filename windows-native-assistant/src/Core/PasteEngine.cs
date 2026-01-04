using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows;
using WindowsNativeAssistant.Config;
using WindowsNativeAssistant.Models;

namespace WindowsNativeAssistant.Core
{
    /// <summary>
    /// Paste engine - handles focus restoration and clipboard paste
    /// This is the most critical component for auto-paste functionality
    /// </summary>
    public class PasteEngine
    {
        // Win32 API imports
        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("kernel32.dll")]
        private static extern uint GetCurrentThreadId();

        private const int SW_RESTORE = 9;

        private readonly AppConfig _config;

        public PasteEngine(AppConfig config)
        {
            _config = config;
        }

        /// <summary>
        /// Get the currently active window handle
        /// </summary>
        public IntPtr GetCurrentActiveWindow()
        {
            return GetForegroundWindow();
        }

        /// <summary>
        /// Execute paste operation with retry logic
        /// </summary>
        public PasteResult ExecutePaste(IntPtr targetWindowHandle, string text)
        {
            var result = new PasteResult
            {
                Success = false,
                Attempts = 0
            };

            // Validate target window
            if (!IsWindow(targetWindowHandle))
            {
                result.Reason = "Target window is no longer valid";
                result.FailureType = FailureType.FocusRestoreFailed;
                return result;
            }

            // Attempt paste with retry
            int maxAttempts = _config.Paste.RetryCount + 1;
            for (int i = 0; i < maxAttempts; i++)
            {
                result.Attempts = i + 1;

                // Step 1: Restore focus to target window
                if (!RestoreFocus(targetWindowHandle))
                {
                    result.Reason = "Failed to restore focus to target window";
                    result.FailureType = FailureType.FocusRestoreFailed;

                    if (i < maxAttempts - 1)
                    {
                        Thread.Sleep(GetRetryDelay(i));
                        continue;
                    }
                    break;
                }

                // Wait for focus to stabilize
                Thread.Sleep(100);

                // Step 2: Write to clipboard
                if (!WriteToClipboard(text))
                {
                    result.Reason = "Failed to write to clipboard";
                    result.FailureType = FailureType.ClipboardWriteFailed;

                    if (i < maxAttempts - 1)
                    {
                        Thread.Sleep(GetRetryDelay(i));
                        continue;
                    }
                    break;
                }

                // Step 3: Send Ctrl+V
                if (!SendCtrlV())
                {
                    result.Reason = "Failed to send Ctrl+V";
                    result.FailureType = FailureType.SendKeysFailed;

                    if (i < maxAttempts - 1)
                    {
                        Thread.Sleep(GetRetryDelay(i));
                        continue;
                    }
                    break;
                }

                // Success!
                result.Success = true;
                result.Reason = null;
                result.FailureType = null;
                return result;
            }

            return result;
        }

        /// <summary>
        /// Restore focus to target window
        /// </summary>
        private bool RestoreFocus(IntPtr targetWindowHandle)
        {
            try
            {
                // Get current foreground window
                IntPtr currentForeground = GetForegroundWindow();

                // If already focused, return success
                if (currentForeground == targetWindowHandle)
                    return true;

                // Try to restore window if minimized
                ShowWindow(targetWindowHandle, SW_RESTORE);
                Thread.Sleep(50);

                // Get thread IDs
                uint currentThreadId = GetCurrentThreadId();
                uint targetThreadId = GetWindowThreadProcessId(targetWindowHandle, out _);

                // Attach input to target thread (helps with focus switching)
                if (targetThreadId != 0 && currentThreadId != targetThreadId)
                {
                    AttachThreadInput(currentThreadId, targetThreadId, true);
                }

                // Set foreground window
                bool success = SetForegroundWindow(targetWindowHandle);

                // Detach input
                if (targetThreadId != 0 && currentThreadId != targetThreadId)
                {
                    AttachThreadInput(currentThreadId, targetThreadId, false);
                }

                // Verify focus was restored
                Thread.Sleep(50);
                IntPtr newForeground = GetForegroundWindow();
                return newForeground == targetWindowHandle;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"RestoreFocus failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Write text to clipboard
        /// </summary>
        private bool WriteToClipboard(string text)
        {
            try
            {
                // Clipboard operations must run on STA thread
                bool success = false;
                Exception? clipboardException = null;

                Thread staThread = new Thread(() =>
                {
                    try
                    {
                        Clipboard.SetText(text, TextDataFormat.UnicodeText);
                        success = true;
                    }
                    catch (Exception ex)
                    {
                        clipboardException = ex;
                    }
                });

                staThread.SetApartmentState(ApartmentState.STA);
                staThread.Start();
                staThread.Join();

                if (clipboardException != null)
                {
                    Console.WriteLine($"Clipboard write failed: {clipboardException.Message}");
                }

                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WriteToClipboard failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Send Ctrl+V key combination using SendInput
        /// </summary>
        private bool SendCtrlV()
        {
            try
            {
                // Use SendKeys for simplicity in MVP
                // In production, consider using SendInput for more reliability
                System.Windows.Forms.SendKeys.SendWait("^v");
                Thread.Sleep(50); // Wait for paste to complete

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SendCtrlV failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Get retry delay based on attempt number
        /// </summary>
        private int GetRetryDelay(int attemptIndex)
        {
            if (attemptIndex < _config.Paste.RetryDelayMs.Length)
            {
                return _config.Paste.RetryDelayMs[attemptIndex];
            }

            // Default to last configured delay
            return _config.Paste.RetryDelayMs[^1];
        }
    }
}
