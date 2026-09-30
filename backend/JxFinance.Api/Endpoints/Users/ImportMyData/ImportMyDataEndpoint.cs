using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.ImportMyData;

public sealed class ImportMyDataEndpoint(IUserImportService importService) : Endpoint<ImportMyDataRequest, ImportMyDataResponse>
{
    public const long MaxFileBytes = 2L * 1024 * 1024 * 1024;

    public override void Configure()
    {
        Post(ApiRoutes.Users + "/me/import");
        Group<UsersGroup>();
        AllowFileUploads();
        MaxRequestBodySize(MaxFileBytes + (1024 * 1024));
        Throttle(hitLimit: 5, durationSeconds: 3600);
        Description(d => d.ProducesProblemDetails(409).Produces(429));
    }

    public override async Task HandleAsync(ImportMyDataRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > MaxFileBytes)
        {
            AddError(r => r.File, "Choose a non-empty data export no larger than 2 GB.", ErrorCodes.ImportInvalidFile);
            await Send.ErrorsAsync(cancellation: ct);
            return;
        }

        await using var stream = req.File.OpenReadStream();
        await Send.OkOrProblemAsync(await importService.ImportAsync(stream, ct), ct);
    }
}
