using mototun.Core.Entities;
using mototun.Core.Enums;

namespace mototun.API.Services.Settings;

public static class RevendeurSettingsPolicy
{
    private const int MinSlaHours = 1;
    private const int MaxSlaHours = 720;
    private const int MinMonthlyInvoiceLimit = 20;
    private const int MaxMonthlyInvoiceLimit = 200_000;
    private const int MinActiveClientLimit = 100;
    private const int MaxActiveClientLimit = 1_000_000;

    public static EffectiveRevendeurSettings BuildEffective(RevendeurSettings? settings)
    {
        var planTier = settings?.PlanTier ?? SubscriptionPlanTier.Starter;
        var planDefaults = ResolvePlanDefaults(planTier);

        var warningAfterHours = Math.Clamp(settings?.WarningAfterHours ?? 12, MinSlaHours, MaxSlaHours);
        var stuckAfterHours = Math.Clamp(settings?.StuckAfterHours ?? 24, warningAfterHours, MaxSlaHours);
        var escalationAfterHours = Math.Clamp(settings?.EscalationAfterHours ?? 48, stuckAfterHours, MaxSlaHours);
        var repeatEveryHours = Math.Clamp(settings?.RepeatEveryHours ?? 24, MinSlaHours, MaxSlaHours);
        var monthlyInvoiceLimit = Math.Clamp(
            settings?.MonthlyInvoiceLimit ?? planDefaults.MonthlyInvoiceLimit,
            MinMonthlyInvoiceLimit,
            MaxMonthlyInvoiceLimit);
        var activeClientLimit = Math.Clamp(
            settings?.ActiveClientLimit ?? planDefaults.ActiveClientLimit,
            MinActiveClientLimit,
            MaxActiveClientLimit);

        return new EffectiveRevendeurSettings
        {
            PlanTier = planTier,
            WarningAfterHours = warningAfterHours,
            StuckAfterHours = stuckAfterHours,
            EscalationAfterHours = escalationAfterHours,
            RepeatEveryHours = repeatEveryHours,
            EnableEscalation = settings?.EnableEscalation ?? true,
            EnableEmail = settings?.EnableEmail ?? true,
            EnableSms = settings?.EnableSms ?? false,
            EnableWhatsApp = settings?.EnableWhatsApp ?? false,
            MonthlyInvoiceLimit = monthlyInvoiceLimit,
            ActiveClientLimit = activeClientLimit
        };
    }

    public static PlanLimitDefaults ResolvePlanDefaults(SubscriptionPlanTier planTier)
    {
        return planTier switch
        {
            SubscriptionPlanTier.Growth => new PlanLimitDefaults(750, 5000),
            SubscriptionPlanTier.Pro => new PlanLimitDefaults(2500, 20000),
            SubscriptionPlanTier.Enterprise => new PlanLimitDefaults(10000, 100000),
            _ => new PlanLimitDefaults(150, 1000)
        };
    }

    public sealed class EffectiveRevendeurSettings
    {
        public SubscriptionPlanTier PlanTier { get; init; } = SubscriptionPlanTier.Starter;
        public int WarningAfterHours { get; init; }
        public int StuckAfterHours { get; init; }
        public int EscalationAfterHours { get; init; }
        public int RepeatEveryHours { get; init; }
        public bool EnableEscalation { get; init; }
        public bool EnableEmail { get; init; }
        public bool EnableSms { get; init; }
        public bool EnableWhatsApp { get; init; }
        public int MonthlyInvoiceLimit { get; init; }
        public int ActiveClientLimit { get; init; }
    }

    public readonly record struct PlanLimitDefaults(int MonthlyInvoiceLimit, int ActiveClientLimit);
}
