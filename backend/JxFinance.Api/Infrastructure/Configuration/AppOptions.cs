using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Configuration;

public sealed class AppOptions
{
    public const string SectionName = "App";

    public string TimeZone { get; set; } = "UTC";

    public string DefaultCulture { get; set; } = "en";

    public Currency ReportingCurrency { get; set; } = Currency.Eur;

    public ExchangeRateOptions ExchangeRates { get; set; } = new();
}

public sealed class ExchangeRateOptions
{
    public bool Enabled { get; set; } = true;

    public string BaseUrl { get; set; } = "https://api.frankfurter.dev/v1/";
}
