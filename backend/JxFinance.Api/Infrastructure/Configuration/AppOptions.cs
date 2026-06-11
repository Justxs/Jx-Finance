namespace JxFinance.Infrastructure.Configuration;

public sealed class AppOptions
{
    public const string SectionName = "App";

    public string TimeZone { get; set; } = "UTC";

    public string DefaultCulture { get; set; } = "en";

    public bool BackupBeforeMigrate { get; set; } = true;

    public bool RequireBackup { get; set; }

    public string BackupDirectory { get; set; } = "backups";
}
