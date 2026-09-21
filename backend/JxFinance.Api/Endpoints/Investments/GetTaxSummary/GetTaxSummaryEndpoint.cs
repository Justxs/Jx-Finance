using FastEndpoints;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetTaxSummary;

public sealed class GetTaxSummaryEndpoint(ITaxSummaryService taxSummaryService)
    : Endpoint<GetTaxSummaryRequest, TaxSummaryResponse>
{
    public override void Configure()
    {
        Get("investments/tax-summary");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(GetTaxSummaryRequest req, CancellationToken ct) =>
        await Send.OkAsync(await taxSummaryService.GetAsync(req, ct), ct);
}
