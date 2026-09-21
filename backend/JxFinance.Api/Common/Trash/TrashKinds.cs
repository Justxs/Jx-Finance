using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Trash;

namespace JxFinance.Common.Trash;

public static class TrashKinds
{
    public static Feature? FeatureOf(TrashKind kind) => kind switch
    {
        TrashKind.Conversion => Feature.MultiCurrency,
        TrashKind.Budget => Feature.Budgets,
        TrashKind.Goal => Feature.Goals,
        TrashKind.Asset or TrashKind.Debt => Feature.NetWorth,
        TrashKind.RecurringBill => Feature.RecurringBills,
        TrashKind.InvestmentTransaction => Feature.Investments,
        TrashKind.CategorizationRule => Feature.CategorizationRules,
        TrashKind.Household => Feature.Households,
        _ => null,
    };

    public static bool IsEnabled(TrashKind kind, InstanceSettingsSnapshot settings) =>
        FeatureOf(kind) is not { } feature || settings.IsEnabled(feature);

    public static IReadOnlyList<TrashKind> Disabled(InstanceSettingsSnapshot settings) =>
        [.. Enum.GetValues<TrashKind>().Where(kind => !IsEnabled(kind, settings))];
}
