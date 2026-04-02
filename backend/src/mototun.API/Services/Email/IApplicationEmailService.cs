namespace mototun.API.Services.Email;

public interface IApplicationEmailService
{
    Task SendPasswordResetAsync(
        string recipientEmail,
        string? userName,
        string resetLink,
        int expiryMinutes,
        CancellationToken cancellationToken = default);

    Task SendWelcomeAsync(
        string recipientEmail,
        string? userName,
        string? accountRole,
        CancellationToken cancellationToken = default);

    Task SendNotificationAsync(
        string recipientEmail,
        string? userName,
        string subject,
        string message,
        CancellationToken cancellationToken = default);

    Task SendInvoiceCreatedAsync(
        string recipientEmail,
        string? userName,
        string invoiceId,
        decimal amount,
        string? message,
        CancellationToken cancellationToken = default);
}
