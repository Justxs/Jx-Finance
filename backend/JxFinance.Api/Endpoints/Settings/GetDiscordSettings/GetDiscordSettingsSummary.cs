using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetDiscordSettings;

public sealed class GetDiscordSettingsSummary : Summary<GetDiscordSettingsEndpoint>
{
    public GetDiscordSettingsSummary()
    {
        Summary = "Read the installation's Discord channel";
        Description = "Answers whether Discord is switched on, whether a webhook is saved, when a message last reached "
            + "it and the last error. The webhook URL is never part of the answer, because anyone holding it can post "
            + "to the channel. disabledByDiscord is true after Discord answered that the webhook no longer exists; "
            + "unreadable is true when the stored URL cannot be decrypted, which a restore into an installation with "
            + "other data protection keys leaves behind. Administrators only.";
        Responses[200] = "The Discord settings, without the webhook URL.";
        Responses[403] = "Only administrators can read installation settings.";
    }
}
