using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;

namespace JxFinance.Common.Settings;

public sealed record InstanceSettingsSnapshot(
    string? InstanceName,
    FeatureFlags Features,
    Currency ReportingCurrency,
    IReadOnlyList<Currency> EnabledCurrencies,
    bool ExchangeRateSyncEnabled,
    string DefaultLanguage,
    string TimeZoneId,
    TimeZoneInfo TimeZone,
    FirstDayOfWeek FirstDayOfWeek,
    Guid? DefaultAccountId,
    int DefaultPageSize)
{
    public bool IsEnabled(Feature feature) => Features.IsEnabled(feature);

    public IReadOnlyList<Currency> UsableCurrencies { get; } =
        Features.MultiCurrency
            ? [ReportingCurrency, .. EnabledCurrencies.Where(c => c != ReportingCurrency)]
            : [ReportingCurrency];

    public static InstanceSettingsSnapshot From(InstanceSettings settings)
    {
        var currencies = settings.EnabledCurrencyCodes
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(code => CurrencyCode.TryParse(code, out var currency) ? currency : (Currency?)null)
            .OfType<Currency>()
            .Distinct()
            .ToList();

        return new InstanceSettingsSnapshot(
            string.IsNullOrWhiteSpace(settings.InstanceName) ? null : settings.InstanceName,
            settings.Features,
            settings.ReportingCurrency,
            currencies.Count == 0 ? Enum.GetValues<Currency>() : currencies,
            settings.ExchangeRateSyncEnabled,
            settings.DefaultLanguage,
            settings.TimeZone,
            ResolveTimeZone(settings.TimeZone),
            settings.FirstDayOfWeek,
            settings.DefaultAccountId,
            settings.DefaultPageSize);
    }

    public static bool IsValidTimeZone(string? id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return false;
        }

        return TimeZoneInfo.TryFindSystemTimeZoneById(id, out _);
    }

    private static TimeZoneInfo ResolveTimeZone(string id) =>
        TimeZoneInfo.TryFindSystemTimeZoneById(id, out var zone) ? zone : TimeZoneInfo.Utc;
}
