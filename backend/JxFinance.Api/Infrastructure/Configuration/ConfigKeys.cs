namespace JxFinance.Infrastructure.Configuration;

public static class ConfigKeys
{
    public const string ApiDocs = AppPrefix + "ApiDocs";
    public const string AttachmentDirectory = AppPrefix + "AttachmentDirectory";
    public const string BackgroundJobs = AppPrefix + "BackgroundJobs";
    public const string BackupDirectory = AppPrefix + "BackupDirectory";
    public const string DataProtectionDirectory = AppPrefix + "DataProtectionDirectory";
    public const string JwtSigningKey = AppPrefix + "Jwt:SigningKey";
    public const string SecureCookies = AppPrefix + "SecureCookies";

    public const string DefaultConnectionName = "Default";
    public const string DefaultConnectionSetting = "ConnectionStrings:" + DefaultConnectionName;
    public const string DefaultConnectionVariable = "ConnectionStrings__" + DefaultConnectionName;

    public const string OtelServiceName = "OTEL_SERVICE_NAME";

    private const string AppPrefix = AppOptions.SectionName + ":";
}
