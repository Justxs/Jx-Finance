using FastEndpoints;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetValueHistory;

public sealed class GetValueHistoryEndpoint(ISecurityPriceService priceService)
    : Endpoint<GetValueHistoryRequest, ValueHistoryResponse>
{
    public override void Configure()
    {
        Get("investments/value-history");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(GetValueHistoryRequest req, CancellationToken ct) =>
        await Send.OkAsync(await priceService.GetValueHistoryAsync(req, ct), ct);
}
