namespace mototun.API.Extensions
{
    public static class ConfigurationValueGuards
    {
        public static bool HasConfiguredValue(string? value)
        {
            return !string.IsNullOrWhiteSpace(value) && !IsPlaceholder(value);
        }

        public static bool IsPlaceholder(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var trimmed = value.Trim();
            if (!trimmed.StartsWith("__", StringComparison.Ordinal)
                || !trimmed.EndsWith("__", StringComparison.Ordinal))
            {
                return false;
            }

            return trimmed.Contains("SET_IN", StringComparison.OrdinalIgnoreCase)
                || trimmed.Contains("PLACEHOLDER", StringComparison.OrdinalIgnoreCase);
        }
    }
}
