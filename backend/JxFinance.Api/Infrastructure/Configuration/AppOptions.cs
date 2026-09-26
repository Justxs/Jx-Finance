using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;

namespace JxFinance.Infrastructure.Configuration;

public sealed class AppOptions
{
    public const string SectionName = "App";

    public string TimeZone { get; set; } = TimeZoneInfo.Utc.Id;

    public string DefaultCulture { get; set; } = AppLanguages.En;

    public Currency ReportingCurrency { get; set; } = Currency.Eur;

    public ExchangeRateOptions ExchangeRates { get; set; } = new();

    public string InteractiveBrokersFlexUrl { get; set; } =
        "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/";

    public long BackupMaxDecompressedBytes { get; set; } = 1024L * 1024 * 1024;

    public int BackupLockTimeoutSeconds { get; set; } = 15;

    public int RevalueBatchSize { get; set; } = 500;

    public int PdfExportMaxRows { get; set; } = 5000;

    public string SiteUrl { get; set; } = string.Empty;

    public EmailOptions Email { get; set; } = new();
}

public sealed class EmailOptions
{
    public int SendTimeoutSeconds { get; set; } = 20;

    public int OutboxBatchSize { get; set; } = 20;

    public int OutboxIntervalSeconds { get; set; } = 60;

    public int PasswordResetMinutes { get; set; } = 60;

    public int KeepSentDays { get; set; } = 7;
}

public sealed class ExchangeRateOptions
{
    public bool Enabled { get; set; } = true;

    public string BaseUrl { get; set; } = "https://api.frankfurter.dev/v1/";
}
