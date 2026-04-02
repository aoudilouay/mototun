using mototun.Core.Enums;

namespace mototun.Core.Entities;

public class RevendeurSettings
{
    public int Id { get; set; }

    public int RevendeurId { get; set; }
    public Revendeur Revendeur { get; set; } = null!;

    public int WarningAfterHours { get; set; } = 12;
    public int StuckAfterHours { get; set; } = 24;
    public int EscalationAfterHours { get; set; } = 48;
    public int RepeatEveryHours { get; set; } = 24;
    public bool EnableEscalation { get; set; } = true;
    public bool EnableEmail { get; set; } = true;
    public bool EnableSms { get; set; }
    public bool EnableWhatsApp { get; set; }

    public SubscriptionPlanTier PlanTier { get; set; } = SubscriptionPlanTier.Starter;
    public int MonthlyInvoiceLimit { get; set; } = 150;
    public int ActiveClientLimit { get; set; } = 1000;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
