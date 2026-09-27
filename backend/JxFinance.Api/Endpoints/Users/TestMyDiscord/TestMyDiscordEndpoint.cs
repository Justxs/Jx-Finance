using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.TestMyDiscord;

public sealed class TestMyDiscordEndpoint(IDiscordWebhookService discord) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Users + "/me/discord/test");
        Group<UsersGroup>();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(204).Produces(429).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await discord.TestAsync(ct), ct);
}
