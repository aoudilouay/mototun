using mototun.Core.Enums;

namespace mototun.Core.DTOs;

public class RevendeurSlaSettingsDto
{
    public int WarningAfterHours { get; set; }
    public int StuckAfterHours { get; set; }
    public int EscalationAfterHours { get; set; }
    public int RepeatEveryHours { get; set; }
    public bool EnableEscalation { get; set; }
    public bool EnableEmail { get; set; }
    public bool EnableSms { get; set; }
    public bool EnableWhatsApp { get; set; }
}

public class UpdateRevendeurSlaSettingsDto
{
    public int WarningAfterHours { get; set; }
    public int StuckAfterHours { get; set; }
    public int EscalationAfterHours { get; set; }
    public int RepeatEveryHours { get; set; }
    public bool EnableEscalation { get; set; }
    public bool EnableEmail { get; set; }
    public bool EnableSms { get; set; }
    public bool EnableWhatsApp { get; set; }
}

public class RevendeurPlanSettingsDto
{
    public SubscriptionPlanTier PlanTier { get; set; }
    public int MonthlyInvoiceLimit { get; set; }
    public int ActiveClientLimit { get; set; }
    public int CurrentMonthInvoiceCount { get; set; }
    public int ActiveClientCount { get; set; }
    public DateTime CurrentPeriodStartUtc { get; set; }
    public DateTime CurrentPeriodEndUtc { get; set; }
}

public class UpdateRevendeurPlanSettingsDto
{
    public SubscriptionPlanTier? PlanTier { get; set; }
    public int? MonthlyInvoiceLimit { get; set; }
    public int? ActiveClientLimit { get; set; }
}
