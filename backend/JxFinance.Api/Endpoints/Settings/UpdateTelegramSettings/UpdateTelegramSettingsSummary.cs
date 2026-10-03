using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Settings.UpdateTelegramSettings;

public sealed class UpdateTelegramSettingsSummary : Summary<UpdateTelegramSettingsEndpoint, UpdateTelegramSettingsRequest>
{
    public UpdateTelegramSettingsSummary()
    {
        Summary = "Save the installation's Telegram group";
        Description = "Stores the bot token and the id of the one Telegram group this installation posts to, and "
            + "switches outbound Telegram traffic on or off for everyone. Members then choose on their profile which "
            + "of their notifications are posted there, with their name in front. The token must be the one "
            + "@BotFather gave, of the form 123456789:AAE…, or the answer is 400 telegram.invalidToken; the chat id is "
            + "a whole number, negative for a group, and 0 answers telegram.invalidChat. Switching Telegram on without "
            + "a saved token answers telegram.invalidToken and without a chat id telegram.invalidChat. The token is "
            + "encrypted before it is stored and never returned. Leaving botToken empty keeps the stored one; a new "
            + "token or a new chat id clears the mark Telegram left on a bot it refused. While Telegram is off nothing "
            + "is queued or sent; messages that were already queued are not sent late but pruned after seven days. "
            + "Administrators only.";
        ExampleRequest = new UpdateTelegramSettingsRequest(
            true,
            "123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k",
            -1001234567890);
        RequestParam(r => r.BotToken, "Leave empty to keep the stored token.");
        RequestParam(r => r.ChatId, "The group's id; null removes it.");
        Responses[200] = "The saved Telegram settings, without the bot token.";
        Responses[400] = "Validation failed, telegram.invalidToken or telegram.invalidChat.";
        Responses[403] = "Only administrators can change installation settings.";
        Responses[429] = "Too many changes from this client; wait and retry.";
        Responses[409] = SummaryText.StaleSettings;
    }
}
