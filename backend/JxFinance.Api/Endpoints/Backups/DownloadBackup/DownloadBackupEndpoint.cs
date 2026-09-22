using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.DownloadBackup;

public sealed class DownloadBackupEndpoint(IBackupService backupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get(ApiRoutes.Backups + "/{id}/download");
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d
            .ClearDefaultProduces(200)
            .Produces<byte[]>(200, MediaTypeNames.Application.Zip, MediaTypeNames.Application.GZip)
            .ProducesProblemDetails(403)
            .ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var download = (await backupService.OpenAsync(Route<Guid>("id"), ct)).ValueOrThrow();
        await using var content = download.Content;
        HttpContext.Response.Headers.CacheControl = "no-store";
        await Send.StreamAsync(content, download.FileName, download.SizeBytes, download.ContentType, cancellation: ct);
    }
}
