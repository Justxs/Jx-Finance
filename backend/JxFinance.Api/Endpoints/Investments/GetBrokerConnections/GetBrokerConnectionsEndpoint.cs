using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetBrokerConnections;

public sealed class GetBrokerConnectionsEndpoint(IBrokerImportService importService)
    : EndpointWithoutRequest<IReadOnlyList<BrokerConnectionResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Investments + "/connections");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await importService.GetConnectionsAsync(ct), ct);
}
