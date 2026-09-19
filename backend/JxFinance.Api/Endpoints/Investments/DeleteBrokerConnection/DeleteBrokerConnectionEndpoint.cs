using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;

namespace JxFinance.Endpoints.Investments.DeleteBrokerConnection;

public sealed class DeleteBrokerConnectionEndpoint(IBrokerImportService importService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("investments/connections/{accountId}");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await importService.DeleteConnectionAsync(Route<Guid>("accountId"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
