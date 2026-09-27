using FastEndpoints;

namespace JxFinance.Endpoints.Users.DeleteMyDiscord;

public sealed class DeleteMyDiscordSummary : Summary<DeleteMyDiscordEndpoint>
{
    public DeleteMyDiscordSummary()
    {
        Summary = "Remove your Discord webhook";
        Description = "Forgets your webhook URL and drops every Discord message still waiting to be sent to it. "
            + "In-app notifications are not affected.";
        Responses[204] = "The webhook is removed.";
        Responses[404] = "No webhook is saved on your profile.";
    }
}
