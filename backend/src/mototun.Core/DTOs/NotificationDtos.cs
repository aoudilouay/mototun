namespace mototun.Core.DTOs;

public class NotificationDto
{
    public string NotificationId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = "slate";
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
}

public class NotificationBulkActionDto
{
    public List<string> NotificationIds { get; set; } = new();
}
