using FastEndpoints;

namespace JxFinance.Endpoints.Investments.ImportSecurityPrices;

public sealed class ImportSecurityPricesRequest
{
    [RouteParam, HideFromDocs]
    public Guid Id { get; set; }

    public IFormFile File { get; set; } = default!;
}
