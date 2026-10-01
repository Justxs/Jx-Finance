using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.GetImportInboxStatus;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Shared;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.Imports;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

[RegisterService<IImportInboxService>(LifeTime.Scoped)]
public sealed class ImportInboxService(AppDbContext db, ImportInboxFolder folder, IClock clock) : IImportInboxService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("No such statement is waiting in your import inbox.");

    public async Task<IReadOnlyList<ImportInboxFileResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var files = await Waiting()
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new { f.Id, f.FileName, f.Format, f.AccountId, f.MappingId, f.CreatedAt })
            .ToListAsync(cancellationToken);
        return files
            .Select(f => new ImportInboxFileResponse(f.Id.Value, f.FileName, f.Format, f.AccountId.Value, f.MappingId?.Value, f.CreatedAt))
            .ToList();
    }

    public async Task<Result<ImportInboxDownload>> OpenAsync(Guid id, CancellationToken cancellationToken)
    {
        var fileId = new ImportInboxFileId(id);
        var found = await Waiting()
            .Where(f => f.Id == fileId)
            .Select(f => new ImportInboxDownload(f.FileName, f.Content!))
            .FirstOrDefaultAsync(cancellationToken);
        return found is null ? NotFound : Result<ImportInboxDownload>.Success(found);
    }

    public async Task<Result<Guid>> DismissAsync(Guid id, CancellationToken cancellationToken)
    {
        var fileId = new ImportInboxFileId(id);
        var now = clock.UtcNow;
        var dismissed = await db.ImportInboxFiles
            .Where(f => f.Id == fileId)
            .ExecuteUpdateAsync(
                set => set
                    .SetProperty(f => f.Content, (byte[]?)null)
                    .SetProperty(f => f.IsDeleted, true)
                    .SetProperty(f => f.UpdatedAt, now),
                cancellationToken);
        return dismissed == 0 ? NotFound : Result<Guid>.Success(id);
    }

    public ImportInboxStatusResponse GetStatus() => new(folder.Directory, folder.RecentFailures());

    private IQueryable<ImportInboxFile> Waiting() =>
        db.ImportInboxFiles.AsNoTracking().Where(f => f.Content != null && db.Accounts.Any(a => a.Id == f.AccountId));
}
