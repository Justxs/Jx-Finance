namespace JxFinance.Common.Telegram;

public interface ITelegramBotClient
{
    Task<TelegramSendResult> SendAsync(TelegramTarget target, string html, CancellationToken cancellationToken);
}
