using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.DeleteMyDiscord;

public sealed class DeleteMyDiscordEndpoint(IDiscordWebhookService discord) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete(ApiRoutes.Users + "/me/discord");
        Group<UsersGroup>();
        Description(d => d.Produces(204).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await discord.DeleteAsync(ct), ct);
}
