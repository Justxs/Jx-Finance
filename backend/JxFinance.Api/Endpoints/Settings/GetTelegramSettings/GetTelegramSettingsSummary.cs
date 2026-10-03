using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetTelegramSettings;

public sealed class GetTelegramSettingsSummary : Summary<GetTelegramSettingsEndpoint>
{
    public GetTelegramSettingsSummary()
    {
        Summary = "Read the installation's Telegram group";
        Description = "Answers whether Telegram is switched on, whether a bot token is saved, the group's chat id, when "
            + "a message last reached it and the last error. The bot token is never part of the answer, because "
            + "anyone holding it controls the bot. disabledByTelegram is true after Telegram answered that the bot was "
            + "removed from the group or its token was revoked; unreadable is true when the stored token cannot be "
            + "decrypted, which a restore into an installation with other data protection keys leaves behind. "
            + "Administrators only.";
        Responses[200] = "The Telegram settings, without the bot token.";
        Responses[403] = "Only administrators can read installation settings.";
    }
}
