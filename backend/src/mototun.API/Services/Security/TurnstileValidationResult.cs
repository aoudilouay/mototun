namespace mototun.API.Services.Security
{
    public class TurnstileValidationResult
    {
        private TurnstileValidationResult(bool success, string message)
        {
            Success = success;
            Message = message;
        }

        public bool Success { get; }
        public string Message { get; }

        public static TurnstileValidationResult Passed() => new(true, string.Empty);

        public static TurnstileValidationResult Failed(string message) =>
            new(false, string.IsNullOrWhiteSpace(message)
                ? "Security verification failed. Please try again."
                : message);
    }
}
