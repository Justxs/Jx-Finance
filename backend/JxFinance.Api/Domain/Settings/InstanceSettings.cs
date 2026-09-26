using JxFinance.Domain.Common;
using JxFinance.Domain.Email;

namespace JxFinance.Domain.Settings;

public sealed class InstanceSettings
{
    public const int SingletonId = 1;
    public const int SmtpDefaultPort = 587;

    public int Id { get; set; } = SingletonId;
    public string? InstanceName { get; set; }
    public FeatureFlags Features { get; set; } = FeatureFlags.All;
    public Currency ReportingCurrency { get; set; } = Currency.Eur;
    public string EnabledCurrencyCodes { get; set; } = string.Empty;
    public bool ExchangeRateSyncEnabled { get; set; } = true;
    public string DefaultLanguage { get; set; } = AppLanguages.En;
    public string TimeZone { get; set; } = TimeZoneInfo.Utc.Id;
    public FirstDayOfWeek FirstDayOfWeek { get; set; } = FirstDayOfWeek.Monday;
    public Guid? DefaultAccountId { get; set; }
    public int DefaultPageSize { get; set; } = 20;
    public bool SmtpEnabled { get; set; }
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = SmtpDefaultPort;
    public SmtpEncryption SmtpEncryption { get; set; } = SmtpEncryption.StartTls;
    public string? SmtpUserName { get; set; }
    public string SmtpProtectedPassword { get; set; } = string.Empty;
    public string? SmtpFromAddress { get; set; }
    public string? SmtpFromName { get; set; }
}
