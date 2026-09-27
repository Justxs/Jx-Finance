using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Endpoints.Users.Shared;

namespace JxFinance.Endpoints.Users.GetMyDiscord;

public sealed class GetMyDiscordEndpoint(IDiscordWebhookService discord) : EndpointWithoutRequest<DiscordWebhookResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Users + "/me/discord");
        Group<UsersGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await discord.GetAsync(ct), ct);
}
