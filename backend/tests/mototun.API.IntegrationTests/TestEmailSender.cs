using mototun.API.Services.Email;

namespace mototun.API.IntegrationTests;

public sealed class TestEmailSender : IEmailSender
{
    public List<SentEmailMessage> SentMessages { get; } = new();

    public Task SendHtmlAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        SentMessages.Add(new SentEmailMessage(to, subject, htmlBody));
        return Task.CompletedTask;
    }

    public Task SendHtmlAsync(
        string to,
        string subject,
        string htmlBody,
        IReadOnlyCollection<EmailAttachment> attachments,
        CancellationToken cancellationToken = default)
    {
        SentMessages.Add(new SentEmailMessage(to, subject, htmlBody)
        {
            Attachments = attachments
                .Select(attachment => new SentEmailAttachment(
                    attachment.FileName,
                    attachment.ContentType,
                    attachment.Content.ToArray()))
                .ToList()
        });
        return Task.CompletedTask;
    }
}

public sealed record SentEmailMessage(string To, string Subject, string HtmlBody)
{
    public IReadOnlyList<SentEmailAttachment> Attachments { get; init; } = Array.Empty<SentEmailAttachment>();
}

public sealed record SentEmailAttachment(string FileName, string? ContentType, byte[] Content);
