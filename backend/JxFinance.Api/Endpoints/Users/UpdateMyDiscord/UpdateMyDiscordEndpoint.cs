using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Endpoints.Users.Shared;

namespace JxFinance.Endpoints.Users.UpdateMyDiscord;

public sealed class UpdateMyDiscordEndpoint(IDiscordWebhookService discord)
    : Endpoint<UpdateMyDiscordRequest, DiscordWebhookResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me/discord");
        Group<UsersGroup>();
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.ProducesProblemDetails(409).Produces(429));
    }

    public override async Task HandleAsync(UpdateMyDiscordRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await discord.UpdateAsync(req, ct), ct);
}
