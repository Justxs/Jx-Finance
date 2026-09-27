using JxFinance.Domain.Common;
using JxFinance.Endpoints.Users.Shared;
using JxFinance.Endpoints.Users.UpdateMyDiscord;

namespace JxFinance.Endpoints.Users.Interfaces;

public interface IDiscordWebhookService
{
    Task<DiscordWebhookResponse> GetAsync(CancellationToken cancellationToken);

    Task<Result<DiscordWebhookResponse>> UpdateAsync(UpdateMyDiscordRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(CancellationToken cancellationToken);

    Task<Result> TestAsync(CancellationToken cancellationToken);
}
