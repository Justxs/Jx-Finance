using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.SyncBrokerConnection;

public sealed class SyncBrokerConnectionEndpoint(IBrokerImportService importService)
    : EndpointWithoutRequest<BrokerImportResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Investments + "/connections/{accountId}/sync");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync((await importService.SyncAsync(Route<Guid>("accountId"), ct)).ValueOrThrow(), ct);
}
