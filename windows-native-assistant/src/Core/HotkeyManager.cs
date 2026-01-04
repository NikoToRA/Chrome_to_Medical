using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Windows.Interop;

namespace WindowsNativeAssistant.Core
{
    /// <summary>
    /// Global hotkey manager using Win32 API
    /// </summary>
    public class HotkeyManager : IDisposable
    {
        // Win32 API imports
        [DllImport("user32.dll")]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll")]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        // Modifier keys
        private const uint MOD_ALT = 0x0001;
        private const uint MOD_CONTROL = 0x0002;
        private const uint MOD_SHIFT = 0x0004;
        private const uint MOD_WIN = 0x0008;

        // Hotkey ID
        private const int HOTKEY_ID = 1;

        // Window message for hotkey
        private const int WM_HOTKEY = 0x0312;

        private readonly IntPtr _windowHandle;
        private HwndSource? _hwndSource;
        private bool _isRegistered = false;

        public event EventHandler? HotkeyPressed;

        public HotkeyManager(IntPtr windowHandle)
        {
            _windowHandle = windowHandle;
        }

        /// <summary>
        /// Register the global hotkey
        /// </summary>
        /// <param name="modifiers">Modifier keys (e.g., "Control+Alt")</param>
        /// <param name="key">Main key (e.g., "A")</param>
        public bool Register(string modifiers, string key)
        {
            try
            {
                if (_isRegistered)
                {
                    Unregister();
                }

                uint modifierFlags = ParseModifiers(modifiers);
                uint virtualKeyCode = (uint)Enum.Parse(typeof(Keys), key);

                _isRegistered = RegisterHotKey(_windowHandle, HOTKEY_ID, modifierFlags, virtualKeyCode);

                if (_isRegistered)
                {
                    // Add message hook to receive WM_HOTKEY
                    _hwndSource = HwndSource.FromHwnd(_windowHandle);
                    if (_hwndSource != null)
                    {
                        _hwndSource.AddHook(WndProc);
                    }
                }

                return _isRegistered;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to register hotkey: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Unregister the global hotkey
        /// </summary>
        public void Unregister()
        {
            if (_isRegistered)
            {
                UnregisterHotKey(_windowHandle, HOTKEY_ID);
                _isRegistered = false;

                if (_hwndSource != null)
                {
                    _hwndSource.RemoveHook(WndProc);
                    _hwndSource = null;
                }
            }
        }

        /// <summary>
        /// Parse modifier string to flags
        /// </summary>
        private uint ParseModifiers(string modifiers)
        {
            uint flags = 0;
            var parts = modifiers.Split('+');

            foreach (var part in parts)
            {
                switch (part.Trim().ToLower())
                {
                    case "control":
                    case "ctrl":
                        flags |= MOD_CONTROL;
                        break;
                    case "alt":
                        flags |= MOD_ALT;
                        break;
                    case "shift":
                        flags |= MOD_SHIFT;
                        break;
                    case "win":
                    case "windows":
                        flags |= MOD_WIN;
                        break;
                }
            }

            return flags;
        }

        /// <summary>
        /// Window procedure to handle hotkey messages
        /// </summary>
        private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (msg == WM_HOTKEY && wParam.ToInt32() == HOTKEY_ID)
            {
                HotkeyPressed?.Invoke(this, EventArgs.Empty);
                handled = true;
            }

            return IntPtr.Zero;
        }

        public void Dispose()
        {
            Unregister();
        }
    }
}
