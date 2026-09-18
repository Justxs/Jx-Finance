using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Settings.Shared;

public sealed record SettingsResponse(
    string? InstanceName,
    FeatureFlags Features,
    Currency ReportingCurrency,
    IReadOnlyList<Currency> EnabledCurrencies,
    bool ExchangeRateSyncEnabled,
    DateOnly? RatesAsOf,
    string DefaultLanguage,
    string TimeZone,
    FirstDayOfWeek FirstDayOfWeek,
    Guid? DefaultAccountId,
    int DefaultPageSize);
