namespace JxFinance.Infrastructure.Configuration;

public sealed class AppOptions
{
    public const string SectionName = "App";

    public string TimeZone { get; set; } = "UTC";

    public string DefaultCulture { get; set; } = "en";

}
