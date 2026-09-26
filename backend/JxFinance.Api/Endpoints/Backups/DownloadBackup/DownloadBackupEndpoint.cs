using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Backups.Interfaces;

namespace JxFinance.Endpoints.Backups.DownloadBackup;

public sealed class DownloadBackupEndpoint(IBackupService backupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get(ApiRoutes.Backups + "/{id}/download");
        Group<BackupsGroup>();
        Description(d => d
            .ProducesFile(MediaTypeNames.Application.Zip, MediaTypeNames.Application.GZip)
            .ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await backupService.OpenAsync(Route<Guid>("id"), ct);
        if (!result.TryGetValue(out var download))
        {
            await Send.ProblemAsync(result.Error, ct);
            return;
        }

        await using var content = download.Content;
        HttpContext.Response.Headers.CacheControl = "no-store";
        await Send.StreamAsync(content, download.FileName, download.SizeBytes, download.ContentType, cancellation: ct);
    }
}
