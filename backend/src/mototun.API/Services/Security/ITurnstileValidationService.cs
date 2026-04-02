namespace mototun.API.Services.Security
{
    public interface ITurnstileValidationService
    {
        Task<TurnstileValidationResult> ValidateAsync(
            string? token,
            string? expectedAction,
            CancellationToken cancellationToken = default);
    }
}
