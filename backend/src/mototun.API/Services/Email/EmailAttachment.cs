namespace mototun.API.Services.Email;

public sealed record EmailAttachment(
    string FileName,
    byte[] Content,
    string? ContentType = null);
