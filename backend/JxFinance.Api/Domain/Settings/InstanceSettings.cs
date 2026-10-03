using JxFinance.Domain.Common;
using JxFinance.Domain.Email;

namespace JxFinance.Domain.Settings;

public sealed class InstanceSettings
{
    public const int SingletonId = 1;
    public const int SmtpDefaultPort = 587;
    public const int ChannelErrorMaxLength = 500;

    public int Id { get; set; } = SingletonId;
    public string? InstanceName { get; set; }
    public FeatureFlags Features { get; set; } = FeatureFlags.Default;
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
    public bool DiscordEnabled { get; set; }
    public string DiscordProtectedUrl { get; set; } = string.Empty;
    public DateTimeOffset? DiscordLastDeliveredAt { get; set; }
    public string? DiscordLastError { get; set; }
    public DateTimeOffset? DiscordDisabledByDiscordAt { get; set; }
    public bool TelegramEnabled { get; set; }
    public string TelegramProtectedToken { get; set; } = string.Empty;
    public long? TelegramChatId { get; set; }
    public DateTimeOffset? TelegramLastDeliveredAt { get; set; }
    public string? TelegramLastError { get; set; }
    public DateTimeOffset? TelegramDisabledByTelegramAt { get; set; }
    public bool SupportLinkEnabled { get; set; } = true;
    public bool PriceSyncEnabled { get; set; }
    public string EodhdProtectedKey { get; set; } = string.Empty;
    public DateTimeOffset? PriceSyncRunAt { get; set; }
    public DateOnly? PriceCallsDate { get; set; }
    public int PriceCallsUsed { get; set; }

    public void RecordDiscordSend(DateTimeOffset now, string? error, bool gone = false)
    {
        DiscordLastError = error;
        if (error is null)
        {
            DiscordLastDeliveredAt = now;
            DiscordDisabledByDiscordAt = null;
        }
        else if (gone)
        {
            DiscordDisabledByDiscordAt = now;
        }
    }

    public void RecordTelegramSend(DateTimeOffset now, string? error, bool gone = false)
    {
        TelegramLastError = error;
        if (error is null)
        {
            TelegramLastDeliveredAt = now;
            TelegramDisabledByTelegramAt = null;
        }
        else if (gone)
        {
            TelegramDisabledByTelegramAt = now;
        }
    }
}
