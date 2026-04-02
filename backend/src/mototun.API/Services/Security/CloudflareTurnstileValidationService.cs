using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using mototun.API.Extensions;

namespace mototun.API.Services.Security
{
    public class CloudflareTurnstileValidationService : ITurnstileValidationService
    {
        private const string GenericFailureMessage = "Security verification failed. Please try again.";
        private readonly HttpClient _httpClient;
        private readonly IOptionsMonitor<CloudflareTurnstileOptions> _optionsMonitor;
        private readonly ILogger<CloudflareTurnstileValidationService> _logger;

        public CloudflareTurnstileValidationService(
            HttpClient httpClient,
            IOptionsMonitor<CloudflareTurnstileOptions> optionsMonitor,
            ILogger<CloudflareTurnstileValidationService> logger)
        {
            _httpClient = httpClient;
            _optionsMonitor = optionsMonitor;
            _logger = logger;
        }

        public async Task<TurnstileValidationResult> ValidateAsync(
            string? token,
            string? expectedAction,
            CancellationToken cancellationToken = default)
        {
            var options = _optionsMonitor.CurrentValue;
            if (!options.Enabled)
            {
                return TurnstileValidationResult.Passed();
            }

            if (string.IsNullOrWhiteSpace(token))
            {
                return TurnstileValidationResult.Failed("Please complete the security challenge.");
            }

            if (!ConfigurationValueGuards.HasConfiguredValue(options.SecretKey))
            {
                _logger.LogError("Cloudflare Turnstile is enabled but Cloudflare:Turnstile:SecretKey is missing.");
                return TurnstileValidationResult.Failed(GenericFailureMessage);
            }

            var endpoint = !ConfigurationValueGuards.HasConfiguredValue(options.VerifyEndpoint)
                ? CloudflareTurnstileOptions.DefaultVerificationEndpoint
                : options.VerifyEndpoint.Trim();

            using var requestContent = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = options.SecretKey,
                ["response"] = token.Trim()
            });

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.PostAsync(endpoint, requestContent, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cloudflare Turnstile verification call failed.");
                return TurnstileValidationResult.Failed(GenericFailureMessage);
            }

            TurnstileSiteVerifyResponse? payload = null;
            try
            {
                payload = await response.Content.ReadFromJsonAsync<TurnstileSiteVerifyResponse>(cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to parse Turnstile verification response.");
            }

            if (!response.IsSuccessStatusCode || payload is null || !payload.Success)
            {
                var errorCodes = payload?.ErrorCodes is { Length: > 0 }
                    ? string.Join(", ", payload.ErrorCodes)
                    : "none";
                _logger.LogInformation(
                    "Turnstile verification rejected. StatusCode={StatusCode}; ErrorCodes={ErrorCodes}",
                    (int)response.StatusCode,
                    errorCodes);
                return TurnstileValidationResult.Failed(GenericFailureMessage);
            }

            if (!string.IsNullOrWhiteSpace(expectedAction)
                && !string.IsNullOrWhiteSpace(payload.Action)
                && !string.Equals(payload.Action, expectedAction, StringComparison.Ordinal))
            {
                _logger.LogInformation(
                    "Turnstile action mismatch. ExpectedAction={ExpectedAction}; ActualAction={ActualAction}",
                    expectedAction,
                    payload.Action);
                return TurnstileValidationResult.Failed(GenericFailureMessage);
            }

            return TurnstileValidationResult.Passed();
        }

        private sealed class TurnstileSiteVerifyResponse
        {
            [JsonPropertyName("success")]
            public bool Success { get; init; }

            [JsonPropertyName("error-codes")]
            public string[]? ErrorCodes { get; init; }

            [JsonPropertyName("action")]
            public string? Action { get; init; }
        }
    }
}
