using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;

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
