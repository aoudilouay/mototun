namespace mototun.API.Services.Security
{
    public class CloudflareTurnstileOptions
    {
        public const string SectionName = "Cloudflare:Turnstile";
        public const string DefaultVerificationEndpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        public bool Enabled { get; set; }
        public string SecretKey { get; set; } = string.Empty;
        public string VerifyEndpoint { get; set; } = DefaultVerificationEndpoint;
    }
}
