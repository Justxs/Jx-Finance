using FastEndpoints;

namespace JxFinance.Endpoints.Users.GetMyDiscord;

public sealed class GetMyDiscordSummary : Summary<GetMyDiscordEndpoint>
{
    public GetMyDiscordSummary()
    {
        Summary = "Read your Discord notification settings";
        Description = "Answers whether a webhook is saved, whether it is switched on, which notification kinds it "
            + "receives, when a message last reached it and the last error. The webhook URL is never part of the "
            + "answer, because anyone holding it can post to the channel. disabledByDiscord is true after Discord "
            + "answered that the webhook no longer exists; unreadable is true when the stored URL cannot be decrypted, "
            + "which a restore into an installation with other data protection keys leaves behind. Without a saved "
            + "webhook the answer lists every kind, as a starting point for the form.";
        Responses[200] = "Your Discord settings, without the webhook URL.";
    }
}
