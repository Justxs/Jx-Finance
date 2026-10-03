namespace JxFinance.Endpoints.Settings.Shared;

public sealed record PublicSettingsResponse(
    string? InstanceName,
    string DefaultLanguage,
    bool EmailEnabled,
    bool DiscordEnabled,
    bool TelegramEnabled,
    bool PasskeysAvailable);
