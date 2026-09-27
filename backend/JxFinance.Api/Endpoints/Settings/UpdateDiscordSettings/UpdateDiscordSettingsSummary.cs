using FastEndpoints;

namespace JxFinance.Endpoints.Settings.UpdateDiscordSettings;

public sealed class UpdateDiscordSettingsSummary : Summary<UpdateDiscordSettingsEndpoint, UpdateDiscordSettingsRequest>
{
    public UpdateDiscordSettingsSummary()
    {
        Summary = "Allow or stop Discord notifications for this installation";
        Description = "Switches outbound Discord traffic on or off for everyone. While it is off no Discord message is "
            + "queued, the outbox sends nothing, and members' test buttons answer discord.disabled. Switching it off "
            + "leaves every member's webhook in place; messages that were already queued are not sent late but pruned "
            + "after seven days. Administrators only.";
        ExampleRequest = new UpdateDiscordSettingsRequest(true);
        Responses[204] = "The switch was saved; the public settings carry it as discordEnabled.";
        Responses[403] = "Only administrators can change installation settings.";
    }
}
