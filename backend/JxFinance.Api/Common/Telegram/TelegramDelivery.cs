using JxFinance.Domain.Settings;

namespace JxFinance.Common.Telegram;

public static class TelegramDelivery
{
    public static async Task<TelegramSendResult> SendAsync(
        this ITelegramBotClient client,
        InstanceSettings settings,
        string token,
        string html,
        CancellationToken cancellationToken)
    {
        var sent = await client.SendAsync(new TelegramTarget(token, settings.TelegramChatId!.Value), html, cancellationToken);
        if (sent.MigrateToChatId is not { } moved)
        {
            return sent;
        }

        settings.TelegramChatId = moved;
        return await client.SendAsync(new TelegramTarget(token, moved), html, cancellationToken);
    }
}
