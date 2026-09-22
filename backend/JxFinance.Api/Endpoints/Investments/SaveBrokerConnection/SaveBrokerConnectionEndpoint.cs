using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.SaveBrokerConnection;

public sealed class SaveBrokerConnectionEndpoint(IBrokerImportService importService)
    : Endpoint<SaveBrokerConnectionRequest, BrokerConnectionResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Investments + "/connections/{accountId}");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(SaveBrokerConnectionRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await importService.SaveConnectionAsync(req, ct), ct);
}
