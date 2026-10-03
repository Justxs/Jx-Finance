namespace JxFinance.Domain.Settings;

public sealed record FeatureFlags(
    bool Budgets,
    bool Goals,
    bool RecurringBills,
    bool NetWorth,
    bool Reports,
    bool Import,
    bool Households,
    bool MultiCurrency,
    bool Investments,
    bool CategorizationRules,
    bool UnusualAmounts,
    bool MonthClose,
    bool ReceiptReading,
    bool ApiTokens,
    bool Locations,
    bool LearnedCategories,
    bool Attachments,
    bool PayeeNames,
    bool People,
    bool CashFlowForecast)
{
    public static FeatureFlags All { get; } = new(true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true);

    public static FeatureFlags Default { get; } = All with { ApiTokens = false, Locations = false, LearnedCategories = false };

    public bool IsEnabled(Feature feature) => feature switch
    {
        Feature.Budgets => Budgets,
        Feature.Goals => Goals,
        Feature.RecurringBills => RecurringBills,
        Feature.NetWorth => NetWorth,
        Feature.Reports => Reports,
        Feature.Import => Import,
        Feature.Households => Households,
        Feature.MultiCurrency => MultiCurrency,
        Feature.Investments => Investments,
        Feature.CategorizationRules => CategorizationRules,
        Feature.UnusualAmounts => UnusualAmounts,
        Feature.MonthClose => MonthClose,
        Feature.ReceiptReading => ReceiptReading,
        Feature.ApiTokens => ApiTokens,
        Feature.Locations => Locations,
        Feature.LearnedCategories => LearnedCategories,
        Feature.Attachments => Attachments,
        Feature.PayeeNames => PayeeNames,
        Feature.People => Households && People,
        Feature.CashFlowForecast => CashFlowForecast,
        _ => true,
    };
}
