namespace mototun.Core.Entities;

public class NotificationState
{
    public int Id { get; set; }

    public int RevendeurId { get; set; }
    public Revendeur Revendeur { get; set; } = null!;

    public string NotificationId { get; set; } = string.Empty;

    public bool IsRead { get; set; }
    public bool IsDismissed { get; set; }

    public DateTime? ReadAt { get; set; }
    public DateTime? DismissedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
