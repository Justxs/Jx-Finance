using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Settings.Shared;

namespace JxFinance.Endpoints.Settings.UpdateSettings;

public sealed record UpdateSettingsRequest(
    string? InstanceName,
    FeatureFlags Features,
    Currency ReportingCurrency,
    IReadOnlyList<Currency> EnabledCurrencies,
    bool ExchangeRateSyncEnabled,
    string DefaultLanguage,
    string TimeZone,
    FirstDayOfWeek FirstDayOfWeek,
    Guid? DefaultAccountId,
    int DefaultPageSize);
