using JxFinance.Domain.Common;

namespace JxFinance.Domain.Settings;

public sealed class InstanceSettings
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;
    public string? InstanceName { get; set; }
    public FeatureFlags Features { get; set; } = FeatureFlags.All;
    public Currency ReportingCurrency { get; set; } = Currency.Eur;
    public string EnabledCurrencyCodes { get; set; } = string.Empty;
    public bool ExchangeRateSyncEnabled { get; set; } = true;
    public string DefaultLanguage { get; set; } = "en";
    public string TimeZone { get; set; } = "UTC";
    public FirstDayOfWeek FirstDayOfWeek { get; set; } = FirstDayOfWeek.Monday;
    public Guid? DefaultAccountId { get; set; }
    public int DefaultPageSize { get; set; } = 20;
}
