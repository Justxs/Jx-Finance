using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.ExportMyData;

public sealed class ExportMyDataEndpoint(IUserExportService exportService) : Endpoint<ExportMyDataRequest>
{
    public override void Configure()
    {
        Get(ApiRoutes.Users + "/me/export");
        Group<UsersGroup>();
        Throttle(hitLimit: 3, durationSeconds: 3600);
        Description(d => d
            .ProducesFile(MediaTypeNames.Application.Zip)
            .ProducesProblemDetails(409)
            .Produces(429));
    }

    public override async Task HandleAsync(ExportMyDataRequest req, CancellationToken ct)
    {
        var result = await exportService.WriteAsync(
            req.Attachments is true,
            fileName =>
            {
                HttpContext.Response.Headers.CacheControl = "no-store";
                return HttpContext.StartDownload(fileName, MediaTypeNames.Application.Zip);
            },
            ct);
        if (result.IsFailure)
        {
            await Send.ProblemAsync(result.Error, ct);
        }
    }
}
