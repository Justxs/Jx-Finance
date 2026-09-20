using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.Interfaces;

namespace JxFinance.Endpoints.Investments.DeleteBrokerConnection;

public sealed class DeleteBrokerConnectionEndpoint(IBrokerImportService importService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("investments/connections/{accountId}");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override string IdParameter => "accountId";

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        importService.DeleteConnectionAsync(id, ct);
}
