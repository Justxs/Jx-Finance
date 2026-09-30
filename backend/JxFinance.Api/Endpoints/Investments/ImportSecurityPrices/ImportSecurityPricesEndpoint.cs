using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Investments.ImportSecurityPrices;

public sealed class ImportSecurityPricesEndpoint(ISecurityPriceService priceService)
    : Endpoint<ImportSecurityPricesRequest, PriceImportResponse>
{
    public const int MaxFileBytes = 5 * 1024 * 1024;

    public override void Configure()
    {
        Post(ApiRoutes.Investments + "/securities/{id:guid}/prices/import");
        Group<InvestmentsGroup>();
        AllowFileUploads();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(ImportSecurityPricesRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > MaxFileBytes)
        {
            AddError(r => r.File, "Choose a non-empty price CSV no larger than 5 MB.", ErrorCodes.ImportInvalidFile);
            await Send.ErrorsAsync(cancellation: ct);
            return;
        }

        await using var stream = req.File.OpenReadStream();
        await Send.OkOrProblemAsync(await priceService.ImportPricesAsync(req.Id, stream, User.IsInRole(AppRoles.Admin), ct), ct);
    }
}
