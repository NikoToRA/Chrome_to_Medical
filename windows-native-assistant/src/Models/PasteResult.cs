namespace WindowsNativeAssistant.Models
{
    /// <summary>
    /// Result of paste operation
    /// </summary>
    public class PasteResult
    {
        public bool Success { get; set; }
        public string? Reason { get; set; }
        public int Attempts { get; set; }
        public FailureType? FailureType { get; set; }
    }

    /// <summary>
    /// Types of paste failure
    /// </summary>
    public enum FailureType
    {
        FocusRestoreFailed,
        ClipboardWriteFailed,
        SendKeysFailed,
        PasteNoEffectSuspected
    }
}
