namespace JxFinance.Common.Discord;

public interface IDiscordWebhookClient
{
    Task<DiscordSendResult> SendAsync(DiscordTarget target, DiscordPost post, CancellationToken cancellationToken);
}
