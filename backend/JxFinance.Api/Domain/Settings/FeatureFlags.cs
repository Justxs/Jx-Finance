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
    bool CategorizationRules)
{
    public static FeatureFlags All { get; } = new(true, true, true, true, true, true, true, true, true, true);

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
        _ => true,
    };
}
