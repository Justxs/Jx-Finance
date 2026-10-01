using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.DownloadImportInboxFile;

public sealed class DownloadImportInboxFileEndpoint(IImportInboxService inboxService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get(ApiRoutes.ImportInbox + "/{id}/file");
        Group<ImportsGroup>();
        Description(d => d.ProducesFile(MediaTypeNames.Application.Octet).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await inboxService.OpenAsync(Route<Guid>("id"), ct);
        if (!result.TryGetValue(out var download))
        {
            await Send.ProblemAsync(result.Error, ct);
            return;
        }

        HttpContext.Response.Headers.XContentTypeOptions = "nosniff";
        await Send.BytesAsync(download.Content, download.FileName, MediaTypeNames.Application.Octet, cancellation: ct);
    }
}
