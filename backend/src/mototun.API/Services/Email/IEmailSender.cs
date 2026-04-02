namespace mototun.API.Services.Email;

public interface IEmailSender
{
    Task SendHtmlAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default);

    Task SendHtmlAsync(
        string to,
        string subject,
        string htmlBody,
        IReadOnlyCollection<EmailAttachment> attachments,
        CancellationToken cancellationToken = default);
}
